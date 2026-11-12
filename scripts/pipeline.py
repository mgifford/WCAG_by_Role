#!/usr/bin/env python3
"""Deterministic normalization of W3C WCAG and ARRM source data. Stdlib only."""
from __future__ import annotations

import argparse
import csv
import hashlib
from datetime import datetime, timezone
from html.parser import HTMLParser
from io import StringIO
import json
from pathlib import Path
import re
import shutil
import sys
import time
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'wcag': 'https://www.w3.org/WAI/WCAG22/wcag.json',
    'tasks': 'https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv',
    'responsibilities': 'https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv',
}
OWNERSHIP_COLUMNS = {
    'Primary Ownership': 'primary',
    'Secondary Ownership': 'secondary',
    'Contributor': 'contributor',
}
OWNERSHIP_SYMBOLS = {'P': 'primary', 'S': 'secondary', 'C': 'contributor'}
VALID_LEVELS = {'A', 'AA', 'AAA'}


def download(url: str, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            req = Request(url, headers={'User-Agent': 'WCAG-by-Role/0.1 (+https://github.com/)', 'Accept': '*/*'})
            with urlopen(req, timeout=25) as response:
                return response.read().decode('utf-8-sig')
        except Exception:
            if attempt + 1 == retries:
                raise
            time.sleep(1 + attempt * 2)
    raise AssertionError('unreachable')


def csv_records(source: str):
    return list(csv.DictReader(StringIO(source.lstrip('\ufeff'))))


def parse_roles(value: str | None) -> list[str]:
    return list(dict.fromkeys(part.strip() for part in (value or '').split(',')
                              if part.strip() and part.strip().lower() not in {'none', 'n/a'}))


def normalize_wcag(source: dict):
    if not isinstance(source.get('principles'), list):
        raise ValueError('Expected WCAG JSON with principles array')
    criteria = []
    retired = []
    for principle in source['principles']:
        for guideline in principle['guidelines']:
            for sc in guideline['successcriteria']:
                num = str(sc['num']).strip()
                data = {
                    'number': num, 'slug': sc['id'], 'name': sc['handle'],
                    'level': sc.get('level', ''), 'principle': principle['handle'],
                    'guideline': f"{guideline['num']} {guideline['handle']}",
                    'normativeUrl': 'https://www.w3.org/TR/WCAG22/#' + sc['id'],
                    'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/' + sc['id'] + '.html',
                    'versions': sc.get('versions', []),
                    'summary': sc.get('title', ''),
                }
                if '2.2' in data['versions'] and data['level'] in VALID_LEVELS:
                    criteria.append(data)
                else:
                    retired.append({'number': num, 'name': data['name'], 'reason': 'Not an active success criterion in WCAG 2.2', 'versions': data['versions']})
    criteria.sort(key=lambda row: tuple(map(int, row['number'].split('.'))))
    if len({sc['number'] for sc in criteria}) != len(criteria):
        raise ValueError('Duplicated active WCAG criterion identifiers')
    return criteria, retired


def normalize_tasks(rows: list[dict], active: set[str]):
    tasks = []
    rejected = []
    ids = set()
    for row in rows:
        task_id = row['ID'].strip()
        number = row['WCAG SC'].strip()
        if task_id in ids:
            raise ValueError(f'Duplicate task ID: {task_id}')
        ids.add(task_id)
        if number not in active:
            rejected.append({'type': 'task', 'id': task_id, 'criterion': number, 'reason': 'No active WCAG 2.2 criterion with this number'})
            continue
        ownership = {level: parse_roles(row.get(column)) for column, level in OWNERSHIP_COLUMNS.items()}
        tasks.append({'id': task_id, 'criterion': number, 'text': row['Task'].strip(),
                      'stage': row.get('Main Role', '').strip(),
                      'starter': row.get('Starter List', '').strip().lower() == 'x',
                      'ownership': ownership})
    return tasks, rejected


def normalize_summaries(rows: list[dict], active: set[str]):
    summaries = {}
    rejected = []
    metadata_columns = {'ID', 'WCAG SC', 'Level'}
    for row in rows:
        number = row['WCAG SC'].strip()
        if number not in active:
            rejected.append({'type': 'summary', 'criterion': number, 'reason': 'No active WCAG 2.2 criterion with this number'})
            continue
        roles = {}
        for role, value in row.items():
            if role in metadata_columns or role is None or not value:
                continue
            flags = [OWNERSHIP_SYMBOLS[flag.strip()] for flag in value.split(',') if flag.strip() in OWNERSHIP_SYMBOLS]
            if flags:
                roles[role] = flags
        summaries[number] = roles
    return summaries, rejected


class BriefParser(HTMLParser):
    """Extract exact plain-text goal/what/why from W3C Understanding 'In Brief'."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.heading_depth = 0
        self.heading = []
        self.in_brief = False
        self.collect_tag = None
        self.collected = []
        self.current_label = None
        self.entries = {}
        self.space_tags = {'p', 'li', 'br'}

    def handle_starttag(self, tag, attrs):
        if tag == 'h2':
            self.heading_depth = 1
            self.heading = []
        elif self.in_brief and tag in ('dt', 'dd'):
            self.collect_tag = tag
            self.collected = []
        elif self.in_brief and self.collect_tag and tag in self.space_tags:
            self.collected.append(' ')

    def handle_data(self, data):
        if self.heading_depth:
            self.heading.append(data)
        if self.in_brief and self.collect_tag:
            self.collected.append(data)

    def handle_endtag(self, tag):
        if tag == 'h2' and self.heading_depth:
            text = ' '.join(''.join(self.heading).split()).lower()
            if self.in_brief and text != 'in brief':
                self.in_brief = False
            elif text == 'in brief':
                self.in_brief = True
            self.heading_depth = 0
        elif self.in_brief and tag == self.collect_tag:
            value = ' '.join(''.join(self.collected).split())
            if tag == 'dt':
                self.current_label = value.lower().strip(':')
            elif self.current_label and value:
                self.entries[self.current_label] = value
            self.collect_tag = None
            self.collected = []


def extract_brief(html: str) -> dict:
    parser = BriefParser()
    parser.feed(html)
    mapping = {'goal': 'goal', 'what to do': 'whatToDo', 'why it’s important': 'whyImportant', "why it's important": 'whyImportant'}
    return {mapping[key]: value for key, value in parser.entries.items() if key in mapping}


def fetch_briefs(criteria: list, workers: int = 6):
    briefs = {}
    failures = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(download, sc['understandingUrl'], 2): sc for sc in criteria}
        for future in as_completed(futures):
            sc = futures[future]
            try:
                brief = extract_brief(future.result())
                if not brief:
                    failures.append({'criterion': sc['number'], 'reason': 'No In Brief section parsed'})
                else:
                    briefs[sc['number']] = brief
            except Exception as error:
                failures.append({'criterion': sc['number'], 'reason': str(error)[:150]})
    return briefs, sorted(failures, key=lambda row: row['criterion'])


def build(source_wcag: dict, source_tasks: str, source_responsibilities: str, *, mode: str, briefs=None, brief_errors=None):
    criteria, retired = normalize_wcag(source_wcag)
    active = {sc['number'] for sc in criteria}
    tasks, rejected_tasks = normalize_tasks(csv_records(source_tasks), active)
    summaries, rejected_summaries = normalize_summaries(csv_records(source_responsibilities), active)
    seen = {t['criterion'] for t in tasks}
    for sc in criteria:
        sc['arrmResponsibilities'] = summaries.get(sc['number'], {})
        sc['inBrief'] = (briefs or {}).get(sc['number'], {})
        sc['mapped'] = sc['number'] in seen
    roles = sorted({r for task in tasks for group in task['ownership'].values() for r in group} |
                   {role for summary in summaries.values() for role in summary})
    if mode == 'production':
        if len(criteria) < 80 or len(tasks) < 180 or len(roles) < 4:
            raise ValueError(f'Incomplete production dataset: {len(criteria)} criteria, {len(tasks)} tasks, {len(roles)} roles')
    audit = {
        'mode': mode, 'generatedAt': datetime.now(timezone.utc).isoformat(),
        'retiredWCAG': retired, 'excludedARRM': rejected_tasks + rejected_summaries,
        'unmappedCriteria': sorted(active - seen, key=lambda n: tuple(map(int, n.split('.')))),
        'understandingFetchIssues': brief_errors or [],
        'counts': {'activeCriteria': len(criteria), 'acceptedTasks': len(tasks), 'roles': len(roles),
                   'retiredWCAG': len(retired), 'excludedARRM': len(rejected_tasks) + len(rejected_summaries),
                   'understandingBriefs': len(briefs or {})},
    }
    data = {'schemaVersion': 1, 'wcagVersion': '2.2', 'mode': mode,
            'generatedAt': audit['generatedAt'], 'sources': SOURCES,
            'criteria': criteria, 'tasks': tasks, 'roles': roles}
    return data, audit


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--mode', choices=['demo', 'production'], default='demo')
    cli.add_argument('--skip-understanding', action='store_true', help='Do not fetch W3C Understanding pages')
    args = cli.parse_args()
    raw = ROOT / 'fixtures' if args.mode == 'demo' else ROOT / '.cache' / 'upstream'
    raw.mkdir(parents=True, exist_ok=True)
    raw_names = {'wcag': 'wcag.json', 'tasks': 'arrm-all-tasks.csv', 'responsibilities': 'arrm-wcag-sc.csv'}
    if args.mode == 'production':
        for key, filename in raw_names.items():
            content = download(SOURCES[key])
            (raw / filename).write_text(content, encoding='utf-8')
    wcag = json.loads((raw / raw_names['wcag']).read_text(encoding='utf-8'))
    tasks = (raw / raw_names['tasks']).read_text(encoding='utf-8')
    summaries = (raw / raw_names['responsibilities']).read_text(encoding='utf-8')
    briefs, problems = {}, []
    if args.mode == 'production' and not args.skip_understanding:
        active, _ = normalize_wcag(wcag)
        briefs, problems = fetch_briefs(active)
    elif args.mode == 'demo':
        sample = raw / 'understanding.json'
        if sample.exists():
            briefs = json.loads(sample.read_text(encoding='utf-8'))
    data, audit = build(wcag, tasks, summaries, mode=args.mode, briefs=briefs, brief_errors=problems)
    hashes = {key: hashlib.sha256((raw / filename).read_bytes()).hexdigest()
              for key, filename in raw_names.items()}
    data['sourceSHA256'] = hashes
    audit['sourceSHA256'] = hashes
    dest = ROOT / 'dist'
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(ROOT / 'web', dest)
    (dest / 'data').mkdir(parents=True, exist_ok=True)
    (dest / 'data' / 'role-data.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (dest / 'data' / 'import-audit.json').write_text(json.dumps(audit, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    (dest / '.nojekyll').touch()
    print(f"{args.mode.upper()} build: {audit['counts']}, omitted {len(audit['excludedARRM'])} legacy mappings")
    if problems:
        print(f'WARNING: {len(problems)} Understanding documents unavailable or unparsed; canonical links retained', file=sys.stderr)

if __name__ == '__main__':
    main()
