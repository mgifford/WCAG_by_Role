#!/usr/bin/env python3
"""Build the read-only MCP dataset bundle from the canonical source snapshot.

The Worker must not fetch data at request time and must not serve demo fixtures.
This build-only step validates ``data/source/role-data.yaml`` and writes two
generated files consumed by the Worker:

``src/generated/dataset.json``
    The normalized criteria, tasks and roles.
``src/generated/meta.json``
    Provenance, counts, distribution URLs and a canonical dataset hash.

The output is generated; never edit it by hand. Run this script through
``pnpm build:data`` or the package scripts.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile

import yaml

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = ROOT / 'data' / 'source' / 'role-data.yaml'
DEFAULT_OUT = Path(__file__).resolve().parents[1] / 'src' / 'generated'
DEFAULT_BASE_URL = 'https://mgifford.github.io/WCAG_by_Role/'
DEFAULT_PROJECT_URL = 'https://github.com/mgifford/WCAG_by_Role'
PACKAGE = json.loads((Path(__file__).resolve().parents[1] / 'package.json').read_text(encoding='utf-8'))

# Canonical role order and slugs shared with web/role-config.js. Adding an ARRM
# role upstream requires an explicit change here and in the Worker; the build
# fails rather than inventing a slug.
ROLES = [
    ('business-analysis', 'Business Analysis'),
    ('content-authoring', 'Content Authoring'),
    ('user-experience-design', 'User Experience (UX) Design'),
    ('visual-design', 'Visual Design'),
    ('front-end-development', 'Front-End Development'),
]
ROLE_NAMES = [name for _, name in ROLES]
LEVELS = ('primary', 'secondary', 'contributor')
CRITERION_RE = re.compile(r'^\d+\.\d+\.\d+$')
TASK_RE = re.compile(r'^[A-Z]{2,6}-\d{3}$')
SHA256_RE = re.compile(r'^[0-9a-f]{64}$')

DISTRIBUTIONS = [
    ('Normalized WCAG and ARRM data', 'data/role-data.json', 'application/json'),
    ('Dataset manifest', 'data/manifest.json', 'application/json'),
    ('Import audit', 'data/import-audit.json', 'application/json'),
    ('ARRM tasks CSV', 'data/tasks.csv', 'text/csv'),
    ('Cross-role comparison CSV', 'data/role-matrix.csv', 'text/csv'),
    ('Criteria CSV', 'data/criteria.csv', 'text/csv'),
    ('Normalized source YAML', 'data/role-data.yaml', 'application/yaml'),
]


class BuildError(Exception):
    pass


def fail(message: str) -> None:
    raise BuildError(message)


def _mapping(value: object, where: str) -> dict:
    if not isinstance(value, dict):
        fail(f'{where} must be a mapping')
    return value


def _list(value: object, where: str, minimum: int = 0) -> list:
    if not isinstance(value, list):
        fail(f'{where} must be a list')
    if len(value) < minimum:
        fail(f'{where} must contain at least {minimum} items')
    return value


def _text(value: object, where: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f'{where} must be a non-empty string')
    return value.strip()


def _https(value: object, where: str) -> str:
    text = _text(value, where)
    if not text.startswith('https://'):
        fail(f'{where} must be an https URL')
    return text


def _roles(values: object, where: str) -> list[str]:
    items = _list(values, where)
    result = []
    for index, item in enumerate(items):
        role = _text(item, f'{where}[{index}]')
        if not isinstance(item, str) or item != item.strip():
            fail(f'{where}[{index}] must be an exact canonical role name')
        if role not in ROLE_NAMES:
            fail(f'{where}[{index}] uses unknown role {role!r}')
        if role in result:
            fail(f'{where} repeats role {role!r}')
        result.append(role)
    return result


def _levels(values: object, where: str) -> list[str]:
    items = _list(values, where)
    result = []
    for index, item in enumerate(items):
        level = _text(item, f'{where}[{index}]')
        if level not in LEVELS:
            fail(f'{where}[{index}] has unknown ownership level {level!r}')
        if level in result:
            fail(f'{where} repeats ownership level {level!r}')
        result.append(level)
    return result


def validate(data: object) -> dict:
    root = _mapping(data, 'dataset')
    if root.get('schemaVersion') != 3:
        fail(f'schemaVersion must be 3, found {root.get("schemaVersion")!r}')
    if root.get('mode') != 'production':
        fail('Refusing to build the MCP dataset from a non-production snapshot. '
             'Production builds must not serve demo fixtures.')
    if root.get('wcagVersion') != '2.2':
        fail(f'wcagVersion must be "2.2", found {root.get("wcagVersion")!r}')

    generated_at = _text(root.get('generatedAt'), 'generatedAt')
    try:
        dt.datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
    except ValueError as exc:
        fail(f'generatedAt is not an ISO 8601 timestamp: {exc}')

    sources = _mapping(root.get('sources'), 'sources')
    for key in ('wcag', 'tasks', 'responsibilities'):
        _https(sources.get(key), f'sources.{key}')
    source_sha = _mapping(root.get('sourceSHA256'), 'sourceSHA256')
    for key in ('wcag', 'tasks', 'responsibilities'):
        value = _text(source_sha.get(key), f'sourceSHA256.{key}')
        if not SHA256_RE.match(value):
            fail(f'sourceSHA256.{key} must be a lowercase SHA-256 hex digest')

    criteria = _list(root.get('criteria'), 'criteria', 80)
    tasks = _list(root.get('tasks'), 'tasks', 180)
    roles = _list(root.get('roles'), 'roles', 5)
    role_values = [_text(role, f'roles[{i}]') for i, role in enumerate(roles)]
    if any(raw != value for raw, value in zip(roles, role_values)):
        fail('roles must be exact canonical role names without surrounding whitespace')

    if sorted(role_values) != sorted(ROLE_NAMES):
        fail('roles must be exactly the five canonical ARRM roles; '
             'update the Worker role map before adding a role')

    criterion_numbers: set[str] = set()
    for index, item in enumerate(criteria):
        where = f'criteria[{index}]'
        criterion = _mapping(item, where)
        number = _text(criterion.get('number'), f'{where}.number')
        slug = _text(criterion.get('slug'), f'{where}.slug')
        name = _text(criterion.get('name'), f'{where}.name')
        for key, value in (('number', number), ('slug', slug), ('name', name)):
            if criterion.get(key) != value:
                fail(f'{where}.{key} must not have leading or trailing whitespace')
        if not CRITERION_RE.match(number):
            fail(f'{where}.number is not a WCAG criterion number: {number!r}')
        if number in criterion_numbers:
            fail(f'duplicate criterion number {number}')
        criterion_numbers.add(number)
        if not re.match(r'^[a-z0-9][a-z0-9-]*$', slug):
            fail(f'{where}.slug is not a lowercase slug: {slug!r}')
        if criterion.get('level') not in ('A', 'AA', 'AAA'):
            fail(f'{where}.level must be A, AA or AAA')
        _https(criterion.get('normativeUrl'), f'{where}.normativeUrl')
        _https(criterion.get('understandingUrl'), f'{where}.understandingUrl')
        if not isinstance(criterion.get('mapped'), bool):
            fail(f'{where}.mapped must be a boolean')
        status = criterion.get('criterionSummaryStatus')
        if status not in ('recorded', 'missing'):
            fail(f'{where}.criterionSummaryStatus must be recorded or missing')
        if status == 'recorded':
            _text(criterion.get('summary'), f'{where}.summary')
        brief = criterion.get('inBrief')
        if brief is not None:
            for key, value in _mapping(brief, f'{where}.inBrief').items():
                _text(value, f'{where}.inBrief.{key}')
        responsibilities = _mapping(criterion.get('arrmResponsibilities'),
                                    f'{where}.arrmResponsibilities')
        for role, levels in responsibilities.items():
            if role not in ROLE_NAMES:
                fail(f'{where}.arrmResponsibilities uses unknown role {role!r}')
            _levels(levels, f'{where}.arrmResponsibilities.{role}')

    task_ids: set[str] = set()
    for index, item in enumerate(tasks):
        where = f'tasks[{index}]'
        task = _mapping(item, where)
        task_id = _text(task.get('id'), f'{where}.id')
        if task.get('id') != task_id:
            fail(f'{where}.id must not have leading or trailing whitespace')
        if not TASK_RE.match(task_id):
            fail(f'{where}.id does not match the ARRM task-id form: {task_id!r}')
        if task_id in task_ids:
            fail(f'duplicate ARRM task id {task_id}')
        task_ids.add(task_id)
        criterion = _text(task.get('criterion'), f'{where}.criterion')
        if task.get('criterion') != criterion:
            fail(f'{where}.criterion must not have leading or trailing whitespace')
        if criterion not in criterion_numbers:
            fail(f'{where}.criterion refers to unknown criterion {criterion!r}')
        _text(task.get('text'), f'{where}.text')
        if 'stage' in task:
            _text(task.get('stage'), f'{where}.stage')
        if 'starter' in task and not isinstance(task.get('starter'), bool):
            fail(f'{where}.starter must be a boolean')
        ownership = _mapping(task.get('ownership'), f'{where}.ownership')
        if set(ownership) != set(LEVELS):
            fail(f'{where}.ownership must contain exactly {", ".join(LEVELS)}')
        for level in LEVELS:
            _roles(ownership.get(level), f'{where}.ownership.{level}')

    return {
        'schemaVersion': root['schemaVersion'],
        'wcagVersion': root['wcagVersion'],
        'mode': root['mode'],
        'generatedAt': generated_at,
        'sources': {key: sources[key] for key in ('wcag', 'tasks', 'responsibilities')},
        'sourceSHA256': {key: source_sha[key] for key in ('wcag', 'tasks', 'responsibilities')},
        'criteria': [dict(item) for item in criteria],
        'tasks': [dict(item) for item in tasks],
        'roles': role_values,
    }


def canonical_bytes(data: dict) -> bytes:
    """Formatting-independent content hash: sorted keys, compact JSON."""
    return json.dumps(data, ensure_ascii=False, sort_keys=True,
                      separators=(',', ':')).encode('utf-8')


def content_bytes(data: dict) -> bytes:
    """Compare source content without the import timestamp.

    A site rebuild can update generatedAt without changing criteria, tasks,
    roles, source URLs or source hashes. That is not data drift. The caller
    still reports the revision difference so it is visible.
    """
    content = dict(data)
    content.pop('generatedAt', None)
    return canonical_bytes(content)


def build_meta(data: dict, dataset_bytes: bytes, base_url: str, project_url: str) -> dict:
    digest = hashlib.sha256(dataset_bytes).hexdigest()
    snapshot_date = data['generatedAt'][:10]
    citation = (
        'WCAG by Role contributors. WCAG by Role: normalized role and task data. '
        f'Source snapshot {snapshot_date}. Original sources: W3C WCAG 2.2 and W3C ARRM.'
    )
    return {
        'metaVersion': 1,
        'server': {'name': 'wcag-by-role-mcp', 'version': PACKAGE['version']},
        'dataset': {
            'schemaVersion': data['schemaVersion'],
            'wcagVersion': data['wcagVersion'],
            'mode': data['mode'],
            'generatedAt': data['generatedAt'],
            'revision': data['generatedAt'],
            'sha256': digest,
            'canonicalBytes': len(dataset_bytes),
            'hashMethod': 'sha256 of sorted-key compact JSON (formatting independent)',
            'counts': {
                'criteria': len(data['criteria']),
                'tasks': len(data['tasks']),
                'roles': len(data['roles']),
            },
            'sources': data['sources'],
            'sourceSHA256': data['sourceSHA256'],
        },
        'roles': [{'slug': slug, 'name': name} for slug, name in ROLES],
        'distributionBaseUrl': base_url,
        'distributions': [
            {'label': label, 'url': base_url + path, 'encodingFormat': mime}
            for label, path, mime in DISTRIBUTIONS
        ],
        'canonicalDataUrl': base_url + 'data/role-data.json',
        'manifestUrl': base_url + 'data/manifest.json',
        'datasetLandingUrl': base_url + 'data/',
        'citation': citation,
        'projectUrl': project_url,
        'attribution': {
            'w3cEndorsed': False,
            'note': (
                'This is an independent project, not an official W3C publication and '
                'not endorsed by W3C. WCAG 2.2 and ARRM wording and ownership remain '
                'subject to their publishers\' terms. ARRM tasks are advisory; a task '
                'that is missing or filtered away does not remove a WCAG obligation.'
            ),
        },
        'guidancePolicy': {
            'reviewedRoleGuidanceAvailable': False,
            'note': (
                'The project has not published independently reviewed per-criterion '
                'role guidance. The MCP server returns original ARRM task records and '
                'an explicit missing-review status; it never generates role advice.'
            ),
        },
    }


def render(data: dict, meta: dict) -> tuple[bytes, bytes]:
    dataset_bytes = json.dumps(data, ensure_ascii=False, sort_keys=True,
                               separators=(',', ':')).encode('utf-8')
    meta_bytes = (json.dumps(meta, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    return dataset_bytes, meta_bytes


def atomic_write(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(content)
        os.replace(temp_name, path)
        os.chmod(path, 0o644)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE,
                        help='Canonical production YAML snapshot')
    parser.add_argument('--out-dir', type=Path, default=DEFAULT_OUT,
                        help='Directory for generated dataset.json and meta.json')
    parser.add_argument('--base-url', default=os.environ.get('PUBLIC_BASE_URL', DEFAULT_BASE_URL),
                        help='Public dataset base URL (absolute, trailing slash)')
    parser.add_argument('--project-url', default=DEFAULT_PROJECT_URL,
                        help='Project repository URL')
    parser.add_argument('--check', action='store_true',
                        help='Fail if the generated files are missing or stale; write nothing')
    parser.add_argument('--expect-sha256',
                        help='Fail unless the canonical dataset hash matches this digest')
    parser.add_argument('--verify-against', type=Path,
                        help='Fail unless this generated role-data JSON matches the source snapshot')
    args = parser.parse_args()

    base_url = args.base_url.strip()
    if not base_url.startswith('https://') or not base_url.endswith('/'):
        print('base URL must be an absolute https URL ending in "/"', file=sys.stderr)
        return 2

    try:
        with args.source.open(encoding='utf-8') as handle:
            raw = yaml.safe_load(handle)
        data = validate(raw)
        dataset_bytes = canonical_bytes(data)
        meta = build_meta(data, dataset_bytes, base_url, args.project_url)
        dataset_bytes, meta_bytes = render(data, meta)
        if args.verify_against is not None:
            with args.verify_against.open(encoding='utf-8') as handle:
                published = json.load(handle)
            if content_bytes(published) != content_bytes(data):
                fail(f'{args.verify_against} does not match the canonical source snapshot; '
                     'rebuild the site and MCP dataset from the same source')
            if published.get('generatedAt') != data['generatedAt']:
                print(f'warning: source content matches {args.verify_against}, but revisions '
                      f'differ (site {published.get("generatedAt")}, MCP {data["generatedAt"]}). '
                      'Rebuild from one snapshot if exact revision parity is required.')
            else:
                print(f'verified against {args.verify_against}')
    except (OSError, yaml.YAMLError, BuildError) as exc:
        print(f'build dataset error: {exc}', file=sys.stderr)
        return 1

    digest = meta['dataset']['sha256']
    if args.expect_sha256 and digest != args.expect_sha256.lower():
        print(f'expected dataset hash {args.expect_sha256}, built {digest}', file=sys.stderr)
        return 1

    dataset_path = args.out_dir / 'dataset.json'
    meta_path = args.out_dir / 'meta.json'
    if args.check:
        stale = []
        for path, expected in ((dataset_path, dataset_bytes), (meta_path, meta_bytes)):
            if not path.is_file() or path.read_bytes() != expected:
                stale.append(str(path))
        if stale:
            print('generated MCP dataset is stale: ' + ', '.join(stale), file=sys.stderr)
            return 1
        print(f'MCP dataset is current: {len(data["criteria"])} criteria, '
              f'{len(data["tasks"])} tasks, 5 roles, sha256 {digest}')
        return 0

    atomic_write(dataset_path, dataset_bytes)
    atomic_write(meta_path, meta_bytes)
    print(f'MCP dataset: {len(data["criteria"])} criteria, {len(data["tasks"])} tasks, '
          f'5 roles, sha256 {digest}')
    print(f'  wrote {dataset_path.relative_to(Path.cwd()) if dataset_path.is_relative_to(Path.cwd()) else dataset_path}')
    print(f'  wrote {meta_path.relative_to(Path.cwd()) if meta_path.is_relative_to(Path.cwd()) else meta_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
