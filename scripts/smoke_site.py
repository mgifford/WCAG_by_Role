#!/usr/bin/env python3
"""Post-deploy smoke checks for the static WCAG by Role site. Stdlib only.

These checks prove that the deployed artefact is a production dataset with
consistent audit metadata. They do not prove WCAG conformance or accessibility.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

MINIMUMS = {'criteria': 80, 'tasks': 180, 'roles': 4}
ASSETS = ('', 'styles.css', 'app.js', 'dom.js', 'role-config.js', 'role-cards.js', 'role-page.js', 'resources.js', 'visuals.js', 'digitala11y-links.js', 'role.html', 'favicon.svg', 'data/role-data.json', 'data/import-audit.json')
REQUIRED_ROLE_MARKERS = (
    'id="role-root"',
    'id="role-status"',
    'src="./role-page.js"',
    'href="./styles.css"',
    'Skip to main content',
)
REQUIRED_INDEX_MARKERS = (
    '<html lang="en">',
    'name="viewport"',
    'name="color-scheme"',
    'href="./styles.css"',
    'src="./app.js"',
    './data/role-data.json',
    './data/import-audit.json',
    'Skip to main content',
    'Important distinction',
    'not an official W3C publication',
)


def fetch(url: str, retries: int = 4, timeout: int = 30):
    last_error = None
    for attempt in range(retries):
        try:
            request = Request(url, headers={
                'User-Agent': 'WCAG-by-Role-smoke/0.1 (+https://github.com/mgifford/WCAG_by_Role)',
                'Accept': '*/*',
                'Cache-Control': 'no-cache',
            })
            with urlopen(request, timeout=timeout) as response:
                return response.status, response.read(), response.headers.get('Content-Type', '')
        except HTTPError as error:
            last_error = error
            if error.code != 429 and error.code < 500:
                raise
        except URLError as error:
            last_error = error
        if attempt + 1 < retries:
            time.sleep(2 * (attempt + 1))
    raise last_error  # type: ignore[misc]


def validate_index(html: str) -> list[str]:
    errors = []
    for marker in REQUIRED_INDEX_MARKERS:
        if marker not in html:
            errors.append(f'index.html is missing expected marker: {marker}')
    if re.search(r'<script[^>]+src="(?!\./)', html):
        errors.append('index.html contains a non-relative script source')
    if re.search(r'<(?:script|link)[^>]+(?:src|href)="/', html):
        errors.append('index.html contains a root-absolute asset path; nested Pages paths will break')
    return errors


def validate_role_shell(html: str) -> list[str]:
    return [f'role.html is missing expected marker: {marker}' for marker in REQUIRED_ROLE_MARKERS if marker not in html]


def validate_payload(data: dict, audit: dict, minimums: dict | None = None) -> list[str]:
    minimums = minimums or MINIMUMS
    errors: list[str] = []
    if not isinstance(data, dict):
        return ['role-data.json is not a JSON object']
    if not isinstance(audit, dict):
        return ['import-audit.json is not a JSON object']

    if data.get('mode') != 'production':
        errors.append(f"role-data.json mode is {data.get('mode')!r}, expected 'production'")
    if data.get('wcagVersion') != '2.2':
        errors.append(f"role-data.json wcagVersion is {data.get('wcagVersion')!r}, expected '2.2'")
    schema = data.get('schemaVersion')
    if not isinstance(schema, int) or schema < 3:
        errors.append(f'role-data.json schemaVersion is {schema!r}, expected 3 or later')
    if audit.get('mode') != 'production':
        errors.append(f"import-audit.json mode is {audit.get('mode')!r}, expected 'production'")
    if audit.get('schemaVersion') != schema:
        errors.append('role-data.json and import-audit.json disagree on schemaVersion')

    criteria = data.get('criteria')
    tasks = data.get('tasks')
    roles = data.get('roles')
    if not isinstance(criteria, list):
        return errors + ['role-data.json criteria is not an array']
    if not isinstance(tasks, list):
        return errors + ['role-data.json tasks is not an array']
    if not isinstance(roles, list):
        return errors + ['role-data.json roles is not an array']
    if len(criteria) < minimums['criteria']:
        errors.append(f'only {len(criteria)} criteria; expected at least {minimums["criteria"]}')
    if len(tasks) < minimums['tasks']:
        errors.append(f'only {len(tasks)} tasks; expected at least {minimums["tasks"]}')
    if len(roles) < minimums['roles']:
        errors.append(f'only {len(roles)} roles; expected at least {minimums["roles"]}')
    if len(set(roles)) != len(roles):
        errors.append('roles contains duplicate labels')

    criterion_numbers = set()
    for criterion in criteria:
        if not isinstance(criterion, dict):
            errors.append('criteria contains a non-object entry')
            continue
        number = criterion.get('number')
        if not isinstance(number, str) or not re.fullmatch(r'\d+\.\d+\.\d+', number):
            errors.append(f'criterion has invalid number: {number!r}')
            continue
        if number in criterion_numbers:
            errors.append(f'duplicate criterion number: {number}')
        criterion_numbers.add(number)
        if number == '4.1.1':
            errors.append('retired WCAG 4.1.1 Parsing is present in live criteria')
        if criterion.get('level') not in {'A', 'AA', 'AAA'}:
            errors.append(f'criterion {number} has invalid level: {criterion.get("level")!r}')
        if not isinstance(criterion.get('name'), str) or not criterion['name'].strip():
            errors.append(f'criterion {number} has an invalid name')
        for key in ('normativeUrl', 'understandingUrl'):
            if not isinstance(criterion.get(key), str) or not criterion[key].startswith('https://'):
                errors.append(f'criterion {number} has invalid {key}')
        if not isinstance(criterion.get('arrmResponsibilities'), dict):
            errors.append(f'criterion {number} has no arrmResponsibilities object')
        if criterion.get('criterionSummaryStatus') not in {'recorded', 'missing'}:
            errors.append(f'criterion {number} has invalid criterionSummaryStatus')
        if not isinstance(criterion.get('inBrief'), dict):
            errors.append(f'criterion {number} has no inBrief object')
        if not isinstance(criterion.get('mapped'), bool):
            errors.append(f'criterion {number} has no boolean mapped flag')

    task_criteria = set()
    task_ids = set()
    for task in tasks:
        if not isinstance(task, dict):
            errors.append('tasks contains a non-object entry')
            continue
        task_id = task.get('id')
        if not isinstance(task_id, str) or not task_id:
            errors.append(f'task has invalid id: {task_id!r}')
            continue
        if task_id in task_ids:
            errors.append(f'duplicate task id: {task_id}')
        task_ids.add(task_id)
        criterion = task.get('criterion')
        if criterion == '4.1.1':
            errors.append(f'retired 4.1.1 Parsing task is live: {task_id}')
        if criterion not in criterion_numbers:
            errors.append(f'task {task_id} references unknown criterion {criterion!r}')
        else:
            task_criteria.add(criterion)
        if not isinstance(task.get('text'), str) or not task['text'].strip():
            errors.append(f'task {task_id} has no text')
        ownership = task.get('ownership')
        if not isinstance(ownership, dict):
            errors.append(f'task {task_id} has no ownership object')
            continue
        for level in ('primary', 'secondary', 'contributor'):
            if not isinstance(ownership.get(level), list):
                errors.append(f'task {task_id} ownership.{level} is not an array')

    counts = audit.get('counts')
    if not isinstance(counts, dict):
        errors.append('import-audit.json counts is not an object')
        counts = {}
    expected_counts = {
        'activeCriteria': len(criteria),
        'acceptedTasks': len(tasks),
        'roles': len(roles),
    }
    for key, expected in expected_counts.items():
        if counts.get(key) != expected:
            errors.append(f'audit counts.{key}={counts.get(key)!r}, expected {expected}')
    for key in ('retiredWCAG', 'excludedARRM'):
        if counts.get(key) != len(audit.get(key) or []):
            errors.append(f'audit counts.{key} does not match its list length')

    retired = audit.get('retiredWCAG')
    if not isinstance(retired, list) or not any(isinstance(row, dict) and row.get('number') == '4.1.1' for row in retired):
        errors.append('import-audit.json does not retain retired 4.1.1 Parsing')
    excluded = audit.get('excludedARRM')
    if not isinstance(excluded, list) or not any(isinstance(row, dict) and row.get('criterion') == '4.1.1' for row in excluded):
        errors.append('import-audit.json does not retain excluded 4.1.1 ARRM records')

    expected_unmapped = sorted(criterion_numbers - task_criteria)
    if sorted(audit.get('unmappedCriteria') or []) != expected_unmapped:
        errors.append('audit unmappedCriteria does not match criteria without tasks')
    without_summary = sorted(
        criterion['number'] for criterion in criteria
        if isinstance(criterion, dict) and criterion.get('criterionSummaryStatus') == 'missing'
    )
    if sorted(audit.get('criteriaWithoutCriterionSummary') or []) != without_summary:
        errors.append('audit criteriaWithoutCriterionSummary does not match the data')

    counted_lists = {
        'taskLevelMismatches': 'taskLevelMismatches',
        'roleNormalizations': 'roleNormalizations',
    }
    for field, count_key in counted_lists.items():
        rows = audit.get(field)
        if not isinstance(rows, list):
            errors.append(f'import-audit.json {field} is not an array')
        elif counts.get(count_key) != len(rows):
            errors.append(f'audit counts.{count_key} does not match {field} length')
    if not isinstance(audit.get('warnings'), list):
        errors.append('import-audit.json warnings is not an array')
    if not isinstance(audit.get('unknownARRMCriteria'), list):
        errors.append('import-audit.json unknownARRMCriteria is not an array')

    sources = data.get('sources')
    hashes = data.get('sourceSHA256') or audit.get('sourceSHA256') or {}
    for key in ('wcag', 'tasks', 'responsibilities'):
        if not isinstance(sources, dict) or not str(sources.get(key, '')).startswith('https://'):
            errors.append(f'role-data.json source URL is missing for {key}')
        if not isinstance(hashes, dict) or not re.fullmatch(r'[0-9a-f]{64}', str(hashes.get(key, ''))):
            errors.append(f'source SHA-256 is missing or invalid for {key}')
    return errors


def check_once(base_url: str) -> tuple[list[str], dict]:
    errors: list[str] = []
    payloads: dict[str, bytes] = {}
    for asset in ASSETS:
        url = urljoin(base_url, asset)
        try:
            status, body, content_type = fetch(url)
        except Exception as error:  # noqa: BLE001 - report the concrete failed asset
            errors.append(f'{url}: {error}')
            continue
        if status != 200:
            errors.append(f'{url}: HTTP {status}')
            continue
        payloads[asset] = body
        if asset == '' and 'text/html' not in content_type:
            errors.append(f'{url}: expected HTML, got {content_type!r}')
        if asset.endswith('.json') and not body:
            errors.append(f'{url}: empty response body')

    index = payloads.get('', b'').decode('utf-8', errors='replace')
    errors.extend(validate_index(index))
    errors.extend(validate_role_shell(payloads.get('role.html', b'').decode('utf-8', errors='replace')))
    data = audit = None
    try:
        data = json.loads(payloads.get('data/role-data.json', b'{}'))
    except json.JSONDecodeError as error:
        errors.append(f'role-data.json is not valid JSON: {error}')
    try:
        audit = json.loads(payloads.get('data/import-audit.json', b'{}'))
    except json.JSONDecodeError as error:
        errors.append(f'import-audit.json is not valid JSON: {error}')
    if isinstance(data, dict) and isinstance(audit, dict):
        errors.extend(validate_payload(data, audit))
    summary = {
        'criteria': len(data.get('criteria', [])) if isinstance(data, dict) else 0,
        'tasks': len(data.get('tasks', [])) if isinstance(data, dict) else 0,
        'roles': len(data.get('roles', [])) if isinstance(data, dict) else 0,
        'briefs': (audit.get('counts') or {}).get('understandingBriefs', 0) if isinstance(audit, dict) else 0,
    }
    return errors, summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default=os.environ.get('SMOKE_URL'),
                        help='Deployed base URL, for example https://owner.github.io/repository/')
    parser.add_argument('--wait', type=int, default=60,
                        help='Seconds to retry stale or unavailable deployments (default: 60)')
    args = parser.parse_args()
    if not args.url:
        parser.error('provide --url or set SMOKE_URL')
    base_url = args.url.rstrip('/') + '/'
    deadline = time.time() + args.wait
    while True:
        try:
            errors, summary = check_once(base_url)
        except Exception as error:  # noqa: BLE001 - top-level smoke failure
            errors, summary = [str(error)], {}
        if not errors:
            print(f"Smoke OK: {summary['criteria']} criteria, {summary['tasks']} tasks, "
                  f"{summary['roles']} roles, {summary['briefs']} Understanding briefs")
            return 0
        if time.time() >= deadline:
            print(f'Smoke FAILED for {base_url}', file=sys.stderr)
            for error in errors:
                print(f' - {error}', file=sys.stderr)
            return 1
        time.sleep(5)


if __name__ == '__main__':
    raise SystemExit(main())
