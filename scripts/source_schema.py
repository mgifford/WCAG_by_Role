#!/usr/bin/env python3
"""Validation rules for the normalized WCAG by Role source snapshot. Stdlib only."""
from __future__ import annotations

import re

VALID_LEVELS = {'A', 'AA', 'AAA'}
VALID_STATUS = {'recorded', 'missing'}
VALID_OWNERSHIP = ('primary', 'secondary', 'contributor')
HEX64 = re.compile(r'^[0-9a-f]{64}$')


def validate_source(data: dict, *, expected_counts: dict | None = None,
                    require_production: bool = False) -> list[str]:
    """Return human-readable problems; an empty list means the snapshot is valid."""
    errors: list[str] = []
    if not isinstance(data, dict):
        return ['source root is not a mapping']

    required = ('schemaVersion', 'wcagVersion', 'mode', 'generatedAt', 'sources',
                'sourceSHA256', 'criteria', 'tasks', 'roles')
    for key in required:
        if key not in data:
            errors.append(f'missing top-level field: {key}')
    if errors:
        return errors

    if data['schemaVersion'] != 3:
        errors.append(f"schemaVersion must be 3, got {data['schemaVersion']!r}")
    if data['wcagVersion'] != '2.2':
        errors.append(f"wcagVersion must be '2.2', got {data['wcagVersion']!r}")
    if data['mode'] not in {'demo', 'production'}:
        errors.append(f"mode must be demo or production, got {data['mode']!r}")
    if not isinstance(data['generatedAt'], str) or not data['generatedAt']:
        errors.append('generatedAt must be a non-empty string')

    criteria = data['criteria']
    tasks = data['tasks']
    roles = data['roles']
    if not isinstance(criteria, list):
        return errors + ['criteria must be a list']
    if not isinstance(tasks, list):
        return errors + ['tasks must be a list']
    if not isinstance(roles, list):
        return errors + ['roles must be a list']
    if len(set(roles)) != len(roles):
        errors.append('roles contains duplicates')
    role_set = set(roles)

    numbers = set()
    for criterion in criteria:
        if not isinstance(criterion, dict):
            errors.append('criteria contains a non-mapping item')
            continue
        number = criterion.get('number')
        if not isinstance(number, str) or not re.fullmatch(r'\d+\.\d+\.\d+', number):
            errors.append(f'invalid criterion number: {number!r}')
            continue
        if number in numbers:
            errors.append(f'duplicate criterion number: {number}')
        numbers.add(number)
        if number == '4.1.1':
            errors.append('retired 4.1.1 Parsing is present in live criteria')
        if criterion.get('level') not in VALID_LEVELS:
            errors.append(f'criterion {number} has invalid level')
        if not isinstance(criterion.get('name'), str) or not criterion['name'].strip():
            errors.append(f'criterion {number} has no name')
        for key in ('normativeUrl', 'understandingUrl'):
            if not str(criterion.get(key, '')).startswith('https://'):
                errors.append(f'criterion {number} has invalid {key}')
        if criterion.get('criterionSummaryStatus') not in VALID_STATUS:
            errors.append(f'criterion {number} has invalid criterionSummaryStatus')
        if not isinstance(criterion.get('arrmResponsibilities'), dict):
            errors.append(f'criterion {number} has no arrmResponsibilities mapping')
        else:
            for role, flags in criterion['arrmResponsibilities'].items():
                if role not in role_set:
                    errors.append(f'criterion {number} summary references unknown role {role!r}')
                if not isinstance(flags, list) or any(flag not in VALID_OWNERSHIP for flag in flags):
                    errors.append(f'criterion {number} has invalid summary flags for {role!r}')
        if not isinstance(criterion.get('inBrief'), dict):
            errors.append(f'criterion {number} has no inBrief mapping')
        if not isinstance(criterion.get('mapped'), bool):
            errors.append(f'criterion {number} has no boolean mapped flag')

    task_ids = set()
    for task in tasks:
        if not isinstance(task, dict):
            errors.append('tasks contains a non-mapping item')
            continue
        task_id = task.get('id')
        if not isinstance(task_id, str) or not task_id:
            errors.append(f'invalid task id: {task_id!r}')
            continue
        if task_id in task_ids:
            errors.append(f'duplicate task id: {task_id}')
        task_ids.add(task_id)
        criterion = task.get('criterion')
        if criterion == '4.1.1':
            errors.append(f'retired 4.1.1 task is live: {task_id}')
        if criterion not in numbers:
            errors.append(f'task {task_id} references unknown criterion {criterion!r}')
        if not isinstance(task.get('text'), str) or not task['text'].strip():
            errors.append(f'task {task_id} has no text')
        ownership = task.get('ownership')
        if not isinstance(ownership, dict):
            errors.append(f'task {task_id} has no ownership mapping')
            continue
        for level in VALID_OWNERSHIP:
            assigned = ownership.get(level)
            if not isinstance(assigned, list):
                errors.append(f'task {task_id} ownership.{level} is not a list')
                continue
            for role in assigned:
                if role not in role_set:
                    errors.append(f'task {task_id} references unknown role {role!r}')

    sources = data['sources']
    if not isinstance(sources, dict):
        errors.append('sources must be a mapping')
    else:
        for key in ('wcag', 'tasks', 'responsibilities'):
            if not str(sources.get(key, '')).startswith('https://'):
                errors.append(f'sources.{key} is missing or not HTTPS')
    hashes = data['sourceSHA256']
    if not isinstance(hashes, dict):
        errors.append('sourceSHA256 must be a mapping')
    else:
        for key in ('wcag', 'tasks', 'responsibilities'):
            if not HEX64.match(str(hashes.get(key, ''))):
                errors.append(f'sourceSHA256.{key} is missing or not a SHA-256')

    if require_production:
        if data['mode'] != 'production':
            errors.append("mode must be 'production'")
        if len(criteria) < 80:
            errors.append(f'only {len(criteria)} criteria; production requires at least 80')
        if len(tasks) < 180:
            errors.append(f'only {len(tasks)} tasks; production requires at least 180')
        if len(roles) < 4:
            errors.append(f'only {len(roles)} roles; production requires at least 4')
    if expected_counts:
        actual = {'criteria': len(criteria), 'tasks': len(tasks), 'roles': len(roles)}
        for key, expected in expected_counts.items():
            if actual[key] != expected:
                errors.append(f'{key} count is {actual[key]}, expected {expected}')

    return errors
