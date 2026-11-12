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
import shutil
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_VERSION = 2
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
TASK_REQUIRED_COLUMNS = (
    'ID', 'WCAG SC', 'Level', 'Task', 'Main Role', 'Starter List',
    'Primary Ownership', 'Secondary Ownership', 'Contributor',
)
SUMMARY_REQUIRED_COLUMNS = ('ID', 'WCAG SC', 'Level')
SUMMARY_METADATA_COLUMNS = {'ID', 'WCAG SC', 'Level'}

# ARRM publishes the same role under a few spellings. Keep this list explicit,
# small and auditable rather than guessing with fuzzy matching. Every rewrite is
# recorded in dist/data/import-audit.json; the task wording itself is untouched.
ROLE_ALIASES = {
    'Business': 'Business Analysis',
    'Front End Development': 'Front-End Development',
    'Front-End Developement': 'Front-End Development',
    'User Experience (UX)': 'User Experience (UX) Design',
    'Design Visual Design': 'Visual Design',
}
ROLE_ORDER = [
    'Business Analysis',
    'Content Authoring',
    'Visual Design',
    'User Experience (UX) Design',
    'Front-End Development',
]
BRIEF_LABELS = {
    'goal': 'goal',
    'what to do': 'whatToDo',
    'author task': 'authorTask',
    "why it's important": 'whyImportant',
    'why it is important': 'whyImportant',
}
HEADING_TAGS = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}


def download(url: str, retries: int = 4) -> str:
    """Fetch a source with bounded retries, including explicit 429 backoff."""
    for attempt in range(retries):
        try:
            req = Request(url, headers={'User-Agent': 'WCAG-by-Role/0.1 (+https://github.com/)', 'Accept': '*/*'})
            with urlopen(req, timeout=30) as response:
                return response.read().decode('utf-8-sig')
        except HTTPError as error:
            if attempt + 1 == retries:
                raise
            retry_after = error.headers.get('Retry-After') if error.headers else None
            delay = int(retry_after) if retry_after and retry_after.isdigit() else 4 * (attempt + 1)
            if error.code != 429 and error.code < 500:
                raise
            time.sleep(delay)
        except Exception:
            if attempt + 1 == retries:
                raise
            time.sleep(2 * (attempt + 1))
    raise AssertionError('unreachable')


def csv_records(source: str):
    return list(csv.DictReader(StringIO(source.lstrip('\ufeff'))))


def validate_csv_headers(rows: list[dict], source_name: str, required: tuple[str, ...]) -> list[str]:
    """Fail with a source-specific message when an upstream header changes or vanishes."""
    if not rows:
        raise ValueError(f'{source_name} is empty')
    headers = list(rows[0].keys())
    missing = [column for column in required if column not in headers]
    if missing:
        raise ValueError(f'{source_name} is missing required column(s): {", ".join(missing)}')
    return headers


def _clean_role(value: str) -> str:
    return ' '.join(value.replace('\u00a0', ' ').split())


def canonical_role(value: str) -> str:
    """Return the canonical ARRM role label, preserving unknown labels verbatim."""
    role = _clean_role(value)
    folded = role.casefold()
    for alias, canonical in ROLE_ALIASES.items():
        if folded == alias.casefold():
            return canonical
    for canonical in ROLE_ORDER:
        if folded == canonical.casefold():
            return canonical
    return role


def split_roles(value: str | None) -> list[str]:
    return [_clean_role(part) for part in (value or '').split(',')
            if part.strip() and part.strip().lower() not in {'none', 'n/a'}]


def parse_roles(value: str | None, normalizations: list | None = None, context: dict | None = None) -> list[str]:
    roles = []
    for raw in split_roles(value):
        role = canonical_role(raw)
        if normalizations is not None and role != raw:
            normalizations.append({**(context or {}), 'raw': raw, 'canonical': role})
        roles.append(role)
    return list(dict.fromkeys(roles))


def normalize_wcag(source: dict):
    if not isinstance(source.get('principles'), list):
        raise ValueError('Expected WCAG JSON with principles array')
    criteria = []
    retired = []
    for principle in source['principles']:
        if not isinstance(principle.get('guidelines'), list):
            raise ValueError('Expected each WCAG principle to contain a guidelines array')
        for guideline in principle['guidelines']:
            if not isinstance(guideline.get('successcriteria'), list):
                raise ValueError('Expected each WCAG guideline to contain a successcriteria array')
            for sc in guideline['successcriteria']:
                try:
                    num = str(sc['num']).strip()
                    slug = sc['id']
                    name = sc['handle']
                except KeyError as error:
                    raise ValueError(f'WCAG success criterion is missing {error.args[0]!r}') from error
                data = {
                    'number': num, 'slug': slug, 'name': name,
                    'level': sc.get('level', ''), 'principle': principle['handle'],
                    'guideline': f"{guideline['num']} {guideline['handle']}",
                    'normativeUrl': 'https://www.w3.org/TR/WCAG22/#' + slug,
                    'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/' + slug + '.html',
                    'versions': sc.get('versions', []),
                    'summary': sc.get('title', ''),
                }
                if '2.2' in data['versions'] and data['level'] in VALID_LEVELS:
                    criteria.append(data)
                else:
                    retired.append({'number': num, 'name': name, 'level': data['level'],
                                    'reason': 'Not an active success criterion in WCAG 2.2',
                                    'versions': data['versions']})
    criteria.sort(key=lambda row: tuple(map(int, row['number'].split('.'))))
    if len({sc['number'] for sc in criteria}) != len(criteria):
        raise ValueError('Duplicated active WCAG criterion identifiers')
    return criteria, retired


def _rejection_reason(number: str, retired_numbers: set[str]) -> str:
    if number in retired_numbers:
        return 'Criterion is retired or removed in WCAG 2.2'
    return 'No WCAG 2.2 criterion with this number'


def normalize_tasks(rows: list[dict], active: set[str], retired_numbers: set[str] | None = None,
                    normalizations: list | None = None, criterion_levels: dict[str, str] | None = None):
    tasks = []
    rejected = []
    level_mismatches = []
    ids = set()
    retired_numbers = retired_numbers or set()
    criterion_levels = criterion_levels or {}
    for row in rows:
        task_id = (row.get('ID') or '').strip()
        number = (row.get('WCAG SC') or '').strip()
        if not task_id:
            raise ValueError('ARRM task row has an empty ID')
        if task_id in ids:
            raise ValueError(f'Duplicate task ID: {task_id}')
        ids.add(task_id)
        if number not in active:
            rejected.append({'type': 'task', 'id': task_id, 'criterion': number,
                             'reason': _rejection_reason(number, retired_numbers)})
            continue
        ownership = {
            level: parse_roles(row.get(column), normalizations,
                               {'source': 'task', 'taskId': task_id, 'column': column})
            for column, level in OWNERSHIP_COLUMNS.items()
        }
        task = {'id': task_id, 'criterion': number, 'text': (row.get('Task') or '').strip(),
                'stage': (row.get('Main Role') or '').strip(),
                'starter': (row.get('Starter List') or '').strip().lower() == 'x',
                'ownership': ownership}
        tasks.append(task)
        task_level = (row.get('Level') or '').strip()
        # The task CSV occasionally disagrees with the WCAG criterion level. Keep
        # the source row, use the WCAG level in the UI, and report the discrepancy.
        if task_level and task_level != criterion_levels.get(number, ''):
            level_mismatches.append({'taskId': task_id, 'criterion': number,
                                     'taskLevel': task_level,
                                     'criterionLevel': criterion_levels.get(number, '')})
    return tasks, rejected, level_mismatches


def normalize_summaries(rows: list[dict], active: set[str], retired_numbers: set[str] | None = None,
                        normalizations: list | None = None):
    summaries = {}
    rejected = []
    unknown_symbols = []
    retired_numbers = retired_numbers or set()
    for row in rows:
        number = (row.get('WCAG SC') or '').strip()
        if number not in active:
            rejected.append({'type': 'summary', 'criterion': number,
                             'reason': _rejection_reason(number, retired_numbers)})
            continue
        roles = {}
        for role, value in row.items():
            if role in SUMMARY_METADATA_COLUMNS or role is None or not value:
                continue
            role_name = canonical_role(role)
            if role_name != role and normalizations is not None:
                normalizations.append({'source': 'criterionSummary', 'criterion': number,
                                       'column': role, 'raw': role, 'canonical': role_name})
            flags = []
            for flag in (part.strip() for part in value.split(',')):
                if not flag:
                    continue
                if flag in OWNERSHIP_SYMBOLS:
                    flags.append(OWNERSHIP_SYMBOLS[flag])
                else:
                    unknown_symbols.append({'criterion': number, 'role': role, 'value': flag})
            if flags:
                roles.setdefault(role_name, [])
                roles[role_name].extend(flag for flag in flags if flag not in roles[role_name])
        summaries[number] = roles
    return summaries, rejected, unknown_symbols


class BriefParser(HTMLParser):
    """Extract exact plain-text goal/what/author-task/why from a W3C 'In Brief' section.

    W3C currently uses an h2 heading and a definition list. The heading level is
    not hard-coded because older Understanding pages used other levels, and the
    'What to do' label appears as 'Author task' on a few criteria.
    """
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.heading_tag = None
        self.heading = []
        self.in_brief = False
        self.collect_tag = None
        self.collected = []
        self.current_label = None
        self.entries = {}
        self.space_tags = {'p', 'li', 'br'}

    def handle_starttag(self, tag, attrs):
        if tag in HEADING_TAGS:
            self.heading_tag = tag
            self.heading = []
        elif self.in_brief and tag in ('dt', 'dd'):
            self.collect_tag = tag
            self.collected = []
        elif self.in_brief and self.collect_tag and tag in self.space_tags:
            self.collected.append(' ')

    def handle_data(self, data):
        if self.heading_tag:
            self.heading.append(data)
        if self.in_brief and self.collect_tag:
            self.collected.append(data)

    def handle_endtag(self, tag):
        if tag == self.heading_tag:
            text = ' '.join(''.join(self.heading).split()).casefold()
            if self.in_brief and text != 'in brief':
                self.in_brief = False
            elif text == 'in brief':
                self.in_brief = True
            self.heading_tag = None
            self.heading = []
        elif self.in_brief and tag == self.collect_tag:
            value = ' '.join(''.join(self.collected).split())
            if tag == 'dt':
                label = value.replace('’', "'").replace('‘', "'")
                self.current_label = ' '.join(label.split()).casefold().rstrip(':')
            elif self.current_label and value and self.current_label not in self.entries:
                self.entries[self.current_label] = value
            self.collect_tag = None
            self.collected = []


def extract_brief(html: str) -> dict:
    parser = BriefParser()
    parser.feed(html)
    return {BRIEF_LABELS[key]: value for key, value in parser.entries.items() if key in BRIEF_LABELS}


def fetch_briefs(criteria: list, workers: int = 6):
    briefs = {}
    failures = []
    partials = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(download, sc['understandingUrl'], 3): sc for sc in criteria}
        for future in as_completed(futures):
            sc = futures[future]
            try:
                brief = extract_brief(future.result())
                if not brief:
                    failures.append({'criterion': sc['number'], 'reason': 'No In Brief section parsed'})
                    continue
                briefs[sc['number']] = brief
                if 'goal' not in brief or 'whyImportant' not in brief or not ({'whatToDo', 'authorTask'} & brief.keys()):
                    partials.append({'criterion': sc['number'],
                                     'fields': sorted(brief.keys()),
                                     'reason': 'In Brief section was found but one or more expected fields were missing'})
            except Exception as error:
                failures.append({'criterion': sc['number'], 'reason': str(error)[:150]})
    return briefs, sorted(failures, key=lambda row: row['criterion']), sorted(partials, key=lambda row: row['criterion'])


def _aggregate_role_normalizations(records: list[dict]) -> list[dict]:
    grouped = {}
    for record in records:
        key = (record['raw'], record['canonical'])
        entry = grouped.setdefault(key, {
            'raw': record['raw'], 'canonical': record['canonical'],
            'occurrences': 0, 'sources': set(), 'taskIds': [], 'criteria': [],
        })
        entry['occurrences'] += 1
        entry['sources'].add(record['source'])
        if record.get('taskId') and record['taskId'] not in entry['taskIds']:
            entry['taskIds'].append(record['taskId'])
        if record.get('criterion') and record['criterion'] not in entry['criteria']:
            entry['criteria'].append(record['criterion'])
    result = []
    for entry in grouped.values():
        entry['sources'] = sorted(entry['sources'])
        entry['taskIds'].sort()
        entry['criteria'].sort()
        result.append(entry)
    return sorted(result, key=lambda entry: (entry['raw'], entry['canonical']))


def build(source_wcag: dict, source_tasks: str, source_responsibilities: str, *, mode: str,
          briefs=None, brief_errors=None, brief_partials=None):
    criteria, retired = normalize_wcag(source_wcag)
    active = {sc['number'] for sc in criteria}
    active_levels = {sc['number']: sc['level'] for sc in criteria}
    retired_numbers = {sc['number'] for sc in retired}

    task_rows = csv_records(source_tasks)
    summary_rows = csv_records(source_responsibilities)
    task_headers = validate_csv_headers(task_rows, 'ARRM task CSV', TASK_REQUIRED_COLUMNS)
    summary_headers = validate_csv_headers(summary_rows, 'ARRM criterion responsibility CSV', SUMMARY_REQUIRED_COLUMNS)
    if len([column for column in summary_headers if column not in SUMMARY_METADATA_COLUMNS]) == 0:
        raise ValueError('ARRM criterion responsibility CSV has no role columns')

    normalizations: list[dict] = []
    tasks, rejected_tasks, level_mismatches = normalize_tasks(
        task_rows, active, retired_numbers, normalizations, active_levels)
    summaries, rejected_summaries, unknown_symbols = normalize_summaries(
        summary_rows, active, retired_numbers, normalizations)
    role_normalizations = _aggregate_role_normalizations(normalizations)

    seen = {t['criterion'] for t in tasks}
    for sc in criteria:
        sc['arrmResponsibilities'] = summaries.get(sc['number'], {})
        sc['inBrief'] = (briefs or {}).get(sc['number'], {})
        sc['mapped'] = sc['number'] in seen
    roles = sorted({r for task in tasks for group in task['ownership'].values() for r in group} |
                   {role for summary in summaries.values() for role in summary},
                   key=lambda role: (ROLE_ORDER.index(role) if role in ROLE_ORDER else len(ROLE_ORDER), role))

    if mode == 'production':
        if len(criteria) < 80 or len(tasks) < 180 or len(roles) < 4:
            raise ValueError(f'Incomplete production dataset: {len(criteria)} criteria, {len(tasks)} tasks, {len(roles)} roles')
        if not summaries:
            raise ValueError('Incomplete production dataset: no ARRM criterion responsibility records')

    unmapped = sorted(active - seen, key=lambda n: tuple(map(int, n.split('.'))))
    without_summary = sorted({sc['number'] for sc in criteria if not sc['arrmResponsibilities']},
                             key=lambda n: tuple(map(int, n.split('.'))))
    rejected_criteria = sorted({row['criterion'] for row in rejected_tasks + rejected_summaries})
    unknown_arrm_criteria = sorted({criterion for criterion in rejected_criteria
                                    if criterion not in active and criterion not in retired_numbers})
    retired_arrm_criteria = sorted({criterion for criterion in rejected_criteria
                                    if criterion in retired_numbers})

    warnings = []
    if unmapped:
        warnings.append(f'{len(unmapped)} active WCAG criteria have no ARRM task mapping: {", ".join(unmapped)}')
    if without_summary:
        warnings.append(f'{len(without_summary)} active WCAG criteria have no ARRM criterion-level summary: {", ".join(without_summary)}')
    if unknown_arrm_criteria:
        warnings.append(f'ARRM contains {len(unknown_arrm_criteria)} criterion number(s) not present in WCAG 2.2: {", ".join(unknown_arrm_criteria)}')
    if retired_arrm_criteria:
        warnings.append(f'ARRM still contains records for retired WCAG criteria: {", ".join(retired_arrm_criteria)}')
    if level_mismatches:
        warnings.append(f'{len(level_mismatches)} ARRM task rows disagree with the WCAG criterion level; WCAG level is used in the UI')
    if role_normalizations:
        warnings.append(f'{len(role_normalizations)} non-canonical ARRM role label(s) were normalized; see roleNormalizations')
    if unknown_symbols:
        warnings.append(f'{len(unknown_symbols)} unrecognized ownership symbol(s) were ignored; see unrecognizedOwnershipValues')
    for record in brief_partials or []:
        warnings.append(f'Understanding In Brief for {record["criterion"]} is partial; official link retained')
    for record in brief_errors or []:
        warnings.append(f'Understanding In Brief for {record["criterion"]} was not parsed; official link retained')

    audit = {
        'mode': mode, 'schemaVersion': SCHEMA_VERSION,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'retiredWCAG': retired,
        'excludedARRM': rejected_tasks + rejected_summaries,
        'unknownARRMCriteria': unknown_arrm_criteria,
        'retiredARRMCriteria': retired_arrm_criteria,
        'unmappedCriteria': unmapped,
        'criteriaWithoutCriterionSummary': without_summary,
        'taskLevelMismatches': level_mismatches,
        'roleNormalizations': role_normalizations,
        'unrecognizedOwnershipValues': unknown_symbols,
        'understandingFetchIssues': brief_errors or [],
        'understandingPartialBriefs': brief_partials or [],
        'warnings': warnings,
        'sourceSchema': {
            'wcagSuccessCriterionKeys': sorted({key for principle in source_wcag.get('principles', [])
                                                for guideline in principle.get('guidelines', [])
                                                for sc in guideline.get('successcriteria', [])
                                                for key in sc}),
            'taskCsvHeaders': task_headers,
            'responsibilityCsvHeaders': summary_headers,
        },
        'counts': {
            'activeCriteria': len(criteria), 'acceptedTasks': len(tasks), 'roles': len(roles),
            'retiredWCAG': len(retired),
            'excludedARRM': len(rejected_tasks) + len(rejected_summaries),
            'criteriaWithTasks': len(seen),
            'criteriaWithCriterionSummary': len(criteria) - len(without_summary),
            'taskLevelMismatches': len(level_mismatches),
            'roleNormalizations': len(role_normalizations),
            'understandingBriefs': len(briefs or {}),
            'understandingPartialBriefs': len(brief_partials or []),
        },
    }
    data = {'schemaVersion': SCHEMA_VERSION, 'wcagVersion': '2.2', 'mode': mode,
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
    briefs, problems, partials = {}, [], []
    if args.mode == 'production' and not args.skip_understanding:
        active, _ = normalize_wcag(wcag)
        briefs, problems, partials = fetch_briefs(active)
    elif args.mode == 'demo':
        sample = raw / 'understanding.json'
        if sample.exists():
            briefs = json.loads(sample.read_text(encoding='utf-8'))
    data, audit = build(wcag, tasks, summaries, mode=args.mode, briefs=briefs,
                        brief_errors=problems, brief_partials=partials)
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
    print(f"{args.mode.upper()} build: {audit['counts']}")
    for warning in audit['warnings']:
        print(f'WARNING: {warning}', file=sys.stderr)


if __name__ == '__main__':
    main()
