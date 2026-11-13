#!/usr/bin/env python3
"""Publish crawlable WCAG-by-Role pages and data from the validated build snapshot.

Run after scripts/pipeline.py and scripts/migrate_source.py. Writes only to dist/.
No network access, AI, Cloudflare Worker, MCP server, or client-side framework.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from hashlib import sha256
from html import escape as html_escape
from io import StringIO
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import shutil
from urllib.parse import quote, urlsplit, urlunsplit
from xml.etree.ElementTree import Element, SubElement, tostring

ROLE_ORDER = [
    ('business-analysis', 'Business Analysis', 'Business analysts'),
    ('content-authoring', 'Content Authoring', 'Content authors'),
    ('user-experience-design', 'User Experience (UX) Design', 'UX designers'),
    ('visual-design', 'Visual Design', 'Visual designers'),
    ('front-end-development', 'Front-End Development', 'Front-end developers'),
]
ROLE_NAMES = {slug: name for slug, name, _ in ROLE_ORDER}
ROLE_TITLES = {slug: title for slug, _, title in ROLE_ORDER}
LEVELS = ('primary', 'secondary', 'contributor')
CATEGORY_BY_PREFIX = {
    'IMG': 'Images and Graphs',
    'SEM': 'Semantic Structure',
    'INP': 'Input Modalities',
    'FRM': 'Form Interactions',
    'CSS': 'CSS and Presentation',
    'NAV': 'Navigation',
    'TAB': 'Data Tables',
    'ANM': 'Animation and Movement',
    'SCT': 'Static Content',
    'DYN': 'Dynamic Interactions',
}
CATEGORY_ORDER = tuple(CATEGORY_BY_PREFIX.values()) + ('Other ARRM tasks',)


def category_for(task_id):
    return CATEGORY_BY_PREFIX.get(str(task_id).split('-')[0].upper(), 'Other ARRM tasks')
REPO_URL = 'https://github.com/mgifford/WCAG_by_Role'
WCAG_URL = 'https://www.w3.org/TR/WCAG22/'
ARRM_URL = 'https://www.w3.org/WAI/planning/arrm/tasks/'
SC_RE = re.compile(r'^\d+\.\d+\.\d+$')
TASK_RE = re.compile(r'^[A-Za-z0-9]+-\d+$')


def e(value):
    return html_escape(str(value or ''), quote=True)


def base_url(url):
    parts = urlsplit(url)
    if parts.scheme != 'https' or not parts.netloc or parts.query or parts.fragment or parts.username:
        raise ValueError('Base URL must be an HTTPS site URL without credentials, query or fragment')
    if '..' in parts.path.split('/'):
        raise ValueError('Base URL path may not contain traversal')
    return urlunsplit(('https', parts.netloc.lower(), parts.path.rstrip('/') + '/', '', ''))


def url(base, path=''):
    return base + quote(path.lstrip('/'), safe='/-._~')


def relative(source, target):
    """Relative links remain functional on GitHub project Pages and local previews."""
    item = target.strip('/')
    if not item or item.endswith('/'):
        item += 'index.html'
    start = posixpath.dirname(source) or '.'
    resolved = posixpath.relpath(item, start)
    return resolved.removesuffix('index.html') or './'


def link(label, href, *, css=''):
    klass = f' class="{e(css)}"' if css else ''
    return f'<a{klass} href="{e(href)}">{e(label)}</a>'


def external(label, href):
    parts = urlsplit(str(href))
    if parts.scheme != 'https' or not parts.netloc:
        raise ValueError(f'Non-HTTPS source link: {href}')
    return link(label, href)


def write(dest, filename, text):
    path = dest / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


def json_script(obj):
    # JSON-LD is inside a script element; avoid closing it with untrusted source text.
    value = json.dumps(obj, ensure_ascii=False, sort_keys=True)
    return value.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')


def page(dest, path, *, base, title, description, content, breadcrumb, jsonld, snapshot):
    canonical = url(base, path.removesuffix('index.html'))
    css = relative(path, 'discovery.css')
    favicon = relative(path, 'favicon.svg')
    png_icon = relative(path, 'favicon-48.png')
    ico_icon = relative(path, 'favicon.ico')
    touch_icon = relative(path, 'apple-touch-icon.png')
    manifest_link = relative(path, 'site.webmanifest')
    social_image = url(base, 'social-card.png')
    home = relative(path, 'index.html')
    data_home = relative(path, 'data/index.html')
    sep = ' / '
    crumbs = sep.join(link(label, relative(path, target)) for label, target in breadcrumb)
    out = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{e(title)} | WCAG by Role</title>
<meta name="description" content="{e(description[:155])}">
<link rel="canonical" href="{e(canonical)}">
<link rel="icon" type="image/x-icon" href="{e(ico_icon)}">
<link rel="icon" type="image/svg+xml" href="{e(favicon)}">
<link rel="icon" type="image/png" sizes="48x48" href="{e(png_icon)}">
<link rel="apple-touch-icon" sizes="180x180" href="{e(touch_icon)}">
<link rel="stylesheet" href="{e(css)}">
<link rel="manifest" href="{e(manifest_link)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)} | WCAG by Role">
<meta property="og:description" content="{e(description[:155])}">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:image" content="{e(social_image)}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json_script(jsonld)}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<header class="site-header"><div class="wrap">
{link('WCAG by Role', home, css='site-name')}
<nav aria-label="Site"><ul>
<li>{link('Explorer', home)}</li><li>{link('Roles', relative(path, 'roles/index.html'))}</li>
<li>{link('Data', data_home)}</li><li>{link('Sources and licences', relative(path, 'credits.html'))}</li>
</ul></nav>
</div></header>
<main class="wrap" id="main">
<nav aria-label="Breadcrumb" class="breadcrumbs">{crumbs}</nav>
{content}
</main>
<footer class="site-footer"><div class="wrap">
<p>Independent role-based reference. WCAG is normative; ARRM tasks are advisory. Project explanations are not W3C guidance.</p>
<p>Source snapshot: <time datetime="{e(snapshot[:10])}">{e(snapshot[:10])}</time> · {link('Download data and review limitations', data_home)}.</p>
</div></footer>
</body></html>
'''
    write(dest, path, out)


def word_list(items):
    return ''.join(f'<li>{e(t)}</li>' for t in items)


def sc_path(sc):
    return f"criteria/{sc['number'].replace('.', '-')}-{sc['slug']}/index.html"


def task_path(task):
    return f"tasks/{task['id']}/index.html"


def compare_path(sc):
    return f"compare/{sc['number'].replace('.', '-')}/index.html"


def role_path(slug):
    return f'roles/{slug}/index.html'


def roles_for_task(task):
    ownership = task.get('ownership', {})
    return {slug: [level for level in LEVELS if name in ownership.get(level, [])]
            for slug, name, _ in ROLE_ORDER}


def ownership_list(task, path):
    own = task.get('ownership', {})
    out = ['<dl class="ownership">']
    for level in LEVELS:
        names = own.get(level, [])
        out.append(f'<dt>{e(level.title())}</dt><dd>')
        if names:
            links = []
            for n in names:
                slug = next((r for r, name, _ in ROLE_ORDER if n == name), None)
                links.append(link(n, relative(path, role_path(slug))) if slug else e(n))
            out.append(', '.join(links))
        else:
            out.append('None recorded')
        out.append('</dd>')
    out.append('</dl>')
    return ''.join(out)


def source_metadata(kind, name, description, canonical, snapshot, *, about=None):
    data = {
        '@context': 'https://schema.org', '@type': kind,
        'name': name, 'description': description,
        'url': canonical, 'inLanguage': 'en',
        'dateModified': snapshot[:10],
        'isBasedOn': [WCAG_URL, ARRM_URL],
    }
    if about:
        data['about'] = {'@type': 'CreativeWork', 'url': about}
    return data


def collect_source(data):
    if not isinstance(data, dict) or not isinstance(data.get('criteria'), list) or not isinstance(data.get('tasks'), list):
        raise ValueError('Expected validated normalized role-data.json with criteria and tasks')
    seen_sc = set()
    for sc in data['criteria']:
        num, slug = sc.get('number', ''), sc.get('slug', '')
        if not SC_RE.fullmatch(str(num)) or not re.fullmatch(r'[a-z0-9-]+', str(slug)):
            raise ValueError(f'Invalid criterion identifier or slug: {num} {slug}')
        if num in seen_sc:
            raise ValueError(f'Duplicate criterion {num}')
        seen_sc.add(num)
        if sc.get('level') not in ('A', 'AA', 'AAA'):
            raise ValueError(f'Invalid criterion level: {num}')
    seen_task = set()
    for task in data['tasks']:
        ident = task.get('id', '')
        if not TASK_RE.fullmatch(str(ident)) or task.get('criterion') not in seen_sc:
            raise ValueError(f'Invalid/orphan task {ident}')
        if ident in seen_task:
            raise ValueError(f'Duplicate task {ident}')
        seen_task.add(ident)
        for level in LEVELS:
            if not isinstance(task.get('ownership', {}).get(level, []), list):
                raise ValueError(f'Invalid {level} roles in {ident}')
    if data.get('mode') == 'production' and (len(seen_sc) < 80 or len(seen_task) < 180):
        raise ValueError('Production data is incomplete: refusing to publish partial production index')
    if data.get('mode') == 'production':
        missing_roles = set(ROLE_NAMES.values()) - set(data.get('roles', []))
        if missing_roles:
            raise ValueError(f'Role metadata differs from source roles: {sorted(missing_roles)}')
    return {sc['number']: sc for sc in data['criteria']}


def csv_cell(value):
    value = str(value if value is not None else '')
    if value.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')):
        return "'" + value
    return value


def write_csv(dest, filename, headings, rows):
    stream = StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=headings, lineterminator='\n', extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        writer.writerow({key: csv_cell(row.get(key, '')) for key in headings})
    write(dest, filename, stream.getvalue())


def copy_yaml(dest, yaml_source, data):
    if yaml_source is None:
        return False
    import yaml
    raw = yaml_source.read_text(encoding='utf-8')
    loaded = yaml.safe_load(raw)
    if loaded != data:
        raise ValueError('YAML snapshot differs from the JSON build; refusing to publish mismatched data')
    write(dest, 'data/role-data.yaml', raw)
    return True


def build_exports(dest, data, *, has_yaml, base):
    scs = data['criteria']
    tasks = data['tasks']
    idx = {s['number']: s for s in scs}
    rows = [{
        'criterion': s['number'], 'name': s['name'], 'level': s['level'],
        'principle': s.get('principle', ''), 'guideline': s.get('guideline', ''),
        'summary': s.get('summary', ''), 'normative_url': s['normativeUrl'],
        'understanding_url': s['understandingUrl'],
        'page_url': url(base, sc_path(s).removesuffix('index.html')),
    } for s in scs]
    write_csv(dest, 'data/criteria.csv', list(rows[0]), rows)
    task_rows = []
    matrix_rows = []
    for t in tasks:
        sc = idx[t['criterion']]
        own = t['ownership']
        task_rows.append({
            'task_id': t['id'], 'criterion': t['criterion'], 'criterion_level': sc['level'],
            'original_arrm_task_text': t['text'], 'primary': ' | '.join(own['primary']),
            'secondary': ' | '.join(own['secondary']), 'contributor': ' | '.join(own['contributor']),
            'source_url': ARRM_URL,
            'page_url': url(base, task_path(t).removesuffix('index.html')),
        })
        matrix = {'task_id': t['id'], 'criterion': t['criterion'], 'original_arrm_task_text': t['text']}
        for slug in ROLE_NAMES:
            matrix[slug] = ' | '.join(level for level in LEVELS if ROLE_NAMES[slug] in own.get(level, [])) or 'not recorded'
        matrix_rows.append(matrix)
    write_csv(dest, 'data/tasks.csv', list(task_rows[0]), task_rows)
    write_csv(dest, 'data/role-matrix.csv', list(matrix_rows[0]), matrix_rows)
    for slug, name, _ in ROLE_ORDER:
        role_rows = []
        for t in tasks:
            levels = [lv for lv in LEVELS if name in t['ownership'].get(lv, [])]
            if levels:
                role_rows.append({'task_id': t['id'], 'criterion': t['criterion'],
                                  'ownership_levels': ' | '.join(levels), 'original_arrm_task_text': t['text'],
                                  'task_url': url(base, task_path(t).removesuffix('index.html'))})
        write_csv(dest, f'data/roles/{slug}.csv', ['task_id', 'criterion', 'ownership_levels',
                                                   'original_arrm_task_text', 'task_url'], role_rows)
    formats = [
        ('Normalized WCAG and ARRM data', 'role-data.json', 'application/json'),
        ('Import audit', 'import-audit.json', 'application/json'),
        ('Criteria CSV', 'criteria.csv', 'text/csv'),
        ('ARRM tasks CSV', 'tasks.csv', 'text/csv'),
        ('Cross-role comparison CSV', 'role-matrix.csv', 'text/csv'),
    ]
    if has_yaml:
        formats.insert(1, ('Normalized source YAML', 'role-data.yaml', 'application/yaml'))
    distributions = []
    for label, item, mime in formats:
        path = dest / 'data' / item
        if not path.is_file():
            continue
        distributions.append({'name': label, 'contentUrl': url(base, 'data/' + item),
                              'encodingFormat': mime, 'sha256': sha256(path.read_bytes()).hexdigest(),
                              'sizeBytes': path.stat().st_size})
    # Files generated in this step are static snapshots, not independent new authorities.
    manifest = {
        'schemaVersion': '1.0', 'project': 'WCAG by Role', 'wcagVersion': data.get('wcagVersion', '2.2'),
        'mode': data.get('mode'), 'generatedAt': data['generatedAt'],
        'sourceSHA256': data.get('sourceSHA256', {}), 'sources': data.get('sources', {}),
        'counts': {'criteria': len(scs), 'tasks': len(tasks), 'roles': len(ROLE_ORDER)},
        'canonicalData': url(base, 'data/role-data.json'),
        'distributions': distributions,
        'warning': 'ARRM tasks are advisory. Project material is not official W3C guidance. Mixed content licences apply.'
    }
    write(dest, 'data/manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    return manifest



def add_project_distributions(dest, repo_root, base, manifest):
    """Publish separately authored personas/profiles without changing their source.

    Draft interpretations are deliberately excluded until separately reviewed.
    """
    sources = [
        (repo_root / 'data/exports/personas.json', 'data/personas.json', 'Persona records JSON', 'application/json'),
        (repo_root / 'data/exports/personas.csv', 'data/personas.csv', 'Persona comparison CSV', 'text/csv'),
    ]
    for slug, _, _ in ROLE_ORDER:
        sources.append((repo_root / f'data/role-profiles/{slug}.yaml',
                        f'data/role-profiles/{slug}.yaml', f'{slug} communication profile YAML', 'application/yaml'))
    for path in sorted((repo_root / 'data/personas').glob('*.yaml')) if (repo_root / 'data/personas').is_dir() else []:
        sources.append((path, f'data/personas/{path.name}', f'Persona {path.stem} YAML', 'application/yaml'))
    for path in sorted((repo_root / 'schemas').glob('*.yaml')) if (repo_root / 'schemas').is_dir() else []:
        sources.append((path, f'data/schemas/{path.name}', f'Schema {path.stem} YAML', 'application/yaml'))
    for src, target, label, mime in sources:
        if not src.is_file():
            continue
        destination = dest / target
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, destination)
        manifest['distributions'].append({
            'name': label, 'contentUrl': url(base, target), 'encodingFormat': mime,
            'sha256': sha256(destination.read_bytes()).hexdigest(),
            'sizeBytes': destination.stat().st_size,
        })
    write(dest, 'data/manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')


def render_criteria(dest, data, sc_index, *, base, snapshot):
    pages = []
    tasks_by_sc = {}
    for t in data['tasks']:
        tasks_by_sc.setdefault(t['criterion'], []).append(t)
    for sc in data['criteria']:
        p = sc_path(sc)
        tasks = tasks_by_sc.get(sc['number'], [])
        items = ''.join(f'<li>{link(t["id"], relative(p, task_path(t)))}: {e(t["text"])}</li>' for t in tasks)
        brief = sc.get('inBrief', {})
        brief_markup = ''
        if brief:
            briefs = [('goal', 'Goal'), ('whatToDo', 'What to do'), ('authorTask', 'Author task'), ('whyImportant', 'Why it is important')]
            fragments = ''.join(f'<dt>{e(label)}</dt><dd>{e(brief[key])}</dd>' for key, label in briefs if brief.get(key))
            brief_markup = '<section aria-labelledby="brief"><h2 id="brief">Understanding WCAG: In Brief</h2>' + \
                '<p class="source-label">W3C informative text, not a normative requirement.</p><dl>' + fragments + '</dl></section>'
        introduction = f'''<h1>{e(sc['number'])} {e(sc['name'])}</h1>
<p class="meta">WCAG 2.2 · Level {e(sc['level'])} · {e(sc.get('principle', ''))} · {e(sc.get('guideline', ''))}</p>
<p>{e(sc.get('summary', ''))}</p>
<p class="source-label">This is W3C-provided descriptive material, not a substitute for the normative success criterion.</p>
<p>{external('Read normative WCAG 2.2 criterion', sc['normativeUrl'])} · {external('Read W3C Understanding', sc['understandingUrl'])}</p>
{brief_markup}
<section aria-labelledby="task-heading"><h2 id="task-heading">Related ARRM tasks ({len(tasks)})</h2>
<p>ARRM tasks are advisory responsibility mappings, not additional WCAG requirements.</p>
<ol>{items or '<li>No source tasks recorded in this snapshot; this is not an exemption.</li>'}</ol>
</section>
<section aria-labelledby="compare-heading"><h2 id="compare-heading">Compare roles</h2>
<p>{link('Compare recorded responsibilities for this criterion', relative(p, compare_path(sc)))}</p></section>
'''
        schema = source_metadata('WebPage', f"WCAG {sc['number']} {sc['name']}",
                                  'Independent navigation page with normative WCAG and ARRM references.',
                                  url(base, p.removesuffix('index.html')), snapshot, about=sc['normativeUrl'])
        page(dest, p, base=base, title=f"WCAG {sc['number']} {sc['name']}",
             description=f"Find WCAG {sc['number']} {sc['name']}, W3C Understanding guidance and related ARRM tasks and professional roles.",
             content=introduction, breadcrumb=[('Home','index.html'), ('Criteria','criteria/index.html')],
             jsonld=schema, snapshot=snapshot)
        pages.append(p)
    return pages


def render_tasks(dest, data, sc_index, *, base, snapshot):
    pages = []
    for t in data['tasks']:
        p = task_path(t)
        sc = sc_index[t['criterion']]
        roles = roles_for_task(t)
        role_links = ''.join(f'<li>{link(ROLE_TITLES[slug], relative(p, role_path(slug)))}: '
                             f'{e(", ".join(levels) if levels else "No task-level ownership recorded")}</li>'
                             for slug, levels in roles.items())
        content = f'''<h1>ARRM task {e(t['id'])}</h1>
<p class="meta">Associated with {link(sc['number'] + ' ' + sc['name'], relative(p, sc_path(sc)))} · WCAG Level {e(sc['level'])}</p>
<h2>Original ARRM task description</h2><blockquote>{e(t['text'])}</blockquote>
<p>{external('ARRM source task listing', ARRM_URL)}</p>
<h2>Task-level responsibilities</h2>{ownership_list(t, p)}
<h2>Compare the professional roles</h2><ul>{role_links}</ul>
<p class="source-label">The listed ownership is imported from ARRM. Absence of an assignment is not a WCAG exemption or a statement about the work your team should do.</p>
<p>{link('Compare roles for the associated criterion', relative(p, compare_path(sc)))}</p>'''
        schema = source_metadata('WebPage', f"ARRM task {t['id']}",
                                  'Original ARRM task and recorded role responsibilities.',
                                  url(base, p.removesuffix('index.html')), snapshot, about=ARRM_URL)
        page(dest, p, base=base, title=f"ARRM task {t['id']}",
             description=f"Original ARRM task {t['id']} for WCAG {sc['number']}: primary, secondary and contributor role assignments.",
             content=content, breadcrumb=[('Home','index.html'), ('Tasks','tasks/index.html')],
             jsonld=schema, snapshot=snapshot)
        pages.append(p)
    return pages


def render_comparison(dest, data, sc_index, *, base, snapshot):
    pages = []
    task_groups = {}
    for t in data['tasks']:
        task_groups.setdefault(t['criterion'], []).append(t)
    for sc in data['criteria']:
        p = compare_path(sc)
        tasks = task_groups.get(sc['number'], [])
        header = ''.join(f'<th scope="col">{e(ROLE_TITLES[slug])}</th>' for slug in ROLE_NAMES)
        rows = []
        for t in tasks:
            matrix = roles_for_task(t)
            entries = ''.join(f'<td>{e(", ".join(matrix[slug]) if matrix[slug] else "Not recorded")}</td>'
                              for slug in ROLE_NAMES)
            rows.append(f'<tr><th scope="row">{link(t["id"], relative(p, task_path(t)))}</th>{entries}</tr>')
        content = f'''<h1>Role comparison: WCAG {e(sc['number'])} {e(sc['name'])}</h1>
<p>These are ARRM task-level primary, secondary and contributor assignments. A blank assignment does not remove WCAG requirements.</p>
<p>{link('Read criterion and W3C source links', relative(p, sc_path(sc)))}</p>
<div class="table-scroll" role="region" tabindex="0" aria-label="Task responsibility matrix, horizontally scrollable">
<table><caption>Recorded ARRM responsibilities for WCAG {e(sc['number'])}</caption>
<thead><tr><th scope="col">ARRM task</th>{header}</tr></thead>
<tbody>{''.join(rows) or '<tr><td colspan="6">No mapped ARRM tasks in this snapshot.</td></tr>'}</tbody></table>
</div>
<p>{link('Download the entire task-role matrix (CSV)', relative(p, 'data/role-matrix.csv'))}</p>
<p class="source-label">No project-authored wording has been generated or inferred in this matrix. Only published ARRM assignments are shown.</p>'''
        schema = source_metadata('WebPage', f"Compare roles for WCAG {sc['number']}",
                                  'ARRM task-level role comparison, not a conformance assessment.',
                                  url(base, p.removesuffix('index.html')), snapshot, about=sc['normativeUrl'])
        page(dest, p, base=base, title=f"Compare roles for WCAG {sc['number']}",
             description=f"Compare recorded ARRM task ownership for WCAG {sc['number']} across five professional accessibility roles.",
             content=content, breadcrumb=[('Home','index.html'), ('Criteria','criteria/index.html')],
             jsonld=schema, snapshot=snapshot)
        pages.append(p)
    return pages


def render_roles(dest, data, *, base, snapshot, root):
    pages = []
    try:
        import yaml
    except ImportError:
        yaml = None
    for slug, name, title in ROLE_ORDER:
        p = role_path(slug)
        profile_path = root / 'data' / 'role-profiles' / (slug + '.yaml')
        profile = yaml.safe_load(profile_path.read_text('utf-8')) if yaml and profile_path.is_file() else {}
        perspective = profile.get('perspective', '')
        rows = []
        totals = {lv: 0 for lv in LEVELS}
        for t in data['tasks']:
            levels = [lv for lv in LEVELS if name in t['ownership'].get(lv, [])]
            if not levels:
                continue
            for lv in levels:
                totals[lv] += 1
            rows.append((t, levels))
        by_category = {}
        for t, levels in rows:
            by_category.setdefault(category_for(t['id']), []).append((t, levels))
        categories_markup = ''
        for category in CATEGORY_ORDER:
            entries = by_category.get(category, [])
            if not entries:
                continue
            by_criterion = {}
            for t, levels in entries:
                by_criterion.setdefault(t['criterion'], []).append((t, levels))
            criterion_markup = ''
            for number in sorted(by_criterion, key=lambda value: tuple(int(x) for x in value.split('.'))):
                criterion = next(sc for sc in data['criteria'] if sc['number'] == number)
                task_items = ''
                task_details = ''
                for t, levels in by_criterion[number]:
                    task_items += (f'<li><span>{e(t["text"])}</span>'
                                   f'<span class="pill">{e(", ".join(level.title() for level in levels))}</span></li>')
                    task_details += (f'<li><strong>{link(t["id"], relative(p, task_path(t)))}</strong>'
                                     f'<span class="pill">{e(", ".join(level.title() for level in levels))}</span>'
                                     f'{ownership_list(t, p)}</li>')
                criterion_markup += f"""<section class="criterion-group">
<h4>{link(criterion['number'] + ' ' + criterion['name'], relative(p, sc_path(criterion)))} <span class="pill">Level {e(criterion['level'])}</span></h4>
<ul class="criterion-bullets">{task_items}</ul>
<details class="criterion-source"><summary>Related tasks and source ({len(by_criterion[number])})</summary>
<ul class="criterion-details">{task_details}</ul>
<p>{external('W3C criterion', criterion['normativeUrl'])} · {external('W3C Understanding', criterion['understandingUrl'])} · {external('ARRM task list', ARRM_URL)}</p>
</details></section>"""
            categories_markup += f"""<section class="role-category"><h3>{e(category)} <span class="pill">{len(entries)} task{'s' if len(entries) != 1 else ''}</span></h3>
{criterion_markup}</section>"""
        image_path = f'assets/personas/{ {"business-analysis":"business-blair", "content-authoring":"content-casey", "user-experience-design":"ux-uma", "visual-design":"visual-val", "front-end-development":"front-end-finley"}[slug] }.png'
        image_tag = f'<img class="persona" loading="lazy" src="{e(relative(p, image_path))}" alt="" width="128" height="128">' if (dest / image_path).exists() else ''
        content = f'''<h1>WCAG guidance for {e(title)}</h1>
{image_tag}<p>{e(perspective or 'Explore recorded ARRM tasks associated with this professional role.')}</p>
<p class="source-label">Role profiles are independently authored project descriptions, not official W3C guidance. Task wording and recorded assignments remain unchanged from ARRM.</p>
<p>{link('Use the interactive role guide', relative(p, 'role.html') + '?role=' + quote(slug))} · {link('Compare all roles', relative(p, 'roles/index.html'))}</p>
<h2>Recorded responsibilities</h2><dl class="totals">
<dt>Primary tasks</dt><dd>{totals['primary']}</dd><dt>Secondary tasks</dt><dd>{totals['secondary']}</dd><dt>Contributor tasks</dt><dd>{totals['contributor']}</dd></dl>
<p>Counts are task-level ARRM assignments for this source snapshot, not a conformance checklist.</p>
<h2>Task categories</h2>
<p>Tasks are grouped by ARRM task category and then by success criterion. If a criterion has tasks in more than one category, it appears under each category with only that category's tasks.</p>
{categories_markup or '<p>No assignments recorded in this snapshot.</p>'}
<p>{link('Download this role’s task list (CSV)', relative(p, f'data/roles/{slug}.csv'))}</p>'''
        schema = source_metadata('WebPage', f'WCAG for {title}',
                                  'Static role guide with original ARRM task descriptions and their assignments.',
                                  url(base, p.removesuffix('index.html')), snapshot, about=ARRM_URL)
        page(dest, p, base=base, title=f'WCAG for {title}',
             description=f"Explore WCAG 2.2 and original ARRM task assignments for {title.lower()}, with authoritative sources and downloadable data.",
             content=content, breadcrumb=[('Home','index.html'), ('Roles','roles/index.html')],
             jsonld=schema, snapshot=snapshot)
        pages.append(p)
    return pages


def render_indexes(dest, data, manifest, *, base, snapshot):
    pages = []
    indexes = [
        ('roles/index.html', 'Browse by professional role',
         '<h1>Accessibility guidance by professional role</h1><p>Choose a role to explore ARRM task assignments. The guidance does not narrow WCAG requirements.</p><ul>' +
         ''.join(f'<li>{link(title, relative("roles/index.html", role_path(slug)))}</li>' for slug, _, title in ROLE_ORDER) + '</ul>'),
        ('criteria/index.html', 'Browse WCAG success criteria',
         '<h1>Browse all active WCAG 2.2 success criteria</h1><p>Every active criterion remains visible, including criteria with no mapped ARRM task.</p><ol>' +
         ''.join(f'<li>{link(sc["number"] + " " + sc["name"], relative("criteria/index.html", sc_path(sc)))} <span class="pill">Level {e(sc["level"])}</span></li>' for sc in data['criteria']) + '</ol>'),
        ('tasks/index.html', 'Browse ARRM tasks',
         '<h1>Browse original ARRM task descriptions</h1><p>Task-level assignments are advisory. See the associated normative WCAG criterion for the requirement.</p><ol>' +
         ''.join(f'<li>{link(t["id"], relative("tasks/index.html", task_path(t)))}: {e(t["text"])}</li>' for t in data['tasks']) + '</ol>')
    ]
    for p, title, content in indexes:
        schema = source_metadata('CollectionPage', title, 'Index of WCAG by Role reference pages.',
                                  url(base, p.removesuffix('index.html')), snapshot)
        page(dest, p, base=base, title=title, description=title + ' with source citations and task-level role mappings.',
             content=content, breadcrumb=[('Home', 'index.html')], jsonld=schema, snapshot=snapshot)
        pages.append(p)
    p = 'data/index.html'
    dls = ''.join(
        '<li>' + link(d['name'] + ' (' + d['encodingFormat'] + ')',
                      relative(p, 'data/' + urlsplit(d['contentUrl']).path.split('/data/', 1)[-1]))
        + '</li>' for d in manifest['distributions'])
    role_exports = ''.join(f'<li>{link(title + " task CSV", relative(p, f"data/roles/{slug}.csv"))}</li>' for slug, _, title in ROLE_ORDER)
    content = f'''<h1>Download and cite WCAG by Role data</h1>
<p>Normalized source records are imported from WCAG 2.2 and W3C ARRM. This project is an independent navigation and interpretation tool, not a W3C publication.</p>
<p><strong>Snapshot:</strong> {e(snapshot)} · <strong>Mode:</strong> {e(manifest['mode'])} · <strong>Criteria:</strong> {len(data['criteria'])} · <strong>Tasks:</strong> {len(data['tasks'])}</p>
<h2>Download formats</h2><ul>{dls}</ul>
<h3>Role-specific CSV exports</h3><ul>{role_exports}</ul>
<h2>Source provenance</h2><ul>
<li>{external('WCAG 2.2 Recommendation', WCAG_URL)}</li>
<li>{external('Understanding WCAG 2.2', 'https://www.w3.org/WAI/WCAG22/Understanding/')}</li>
<li>{external('W3C ARRM task list', ARRM_URL)}</li>
<li>{external('ARRM responsibilities', 'https://www.w3.org/WAI/planning/arrm/wcag-sc/')}</li>
</ul><p>Review hashes, dates, input URLs and distribution sizes in {link('the dataset manifest', relative(p, 'data/manifest.json'))} and {link('the import audit', relative(p, 'data/import-audit.json'))}.</p>
<h2>Licensing, attribution and limitations</h2>
<p>Mixed content licences apply. Do not assume the application’s MIT code licence applies to W3C source material or the published dataset. See {link('credits and licences', relative(p, 'credits.html'))}.</p>
<p>ARRM assigns advisory responsibilities to tasks. Role filters cannot establish WCAG conformance or remove WCAG requirements. Do not use the exports as an accessibility certification.</p>
<h2>Suggested citation</h2><p>WCAG by Role contributors. <cite>WCAG by Role: normalized role and task data</cite>. Source snapshot {e(snapshot[:10])}. {link('Data manifest', relative(p, 'data/manifest.json'))}. Original sources: W3C WCAG 2.2 and W3C ARRM.</p>
'''
    dataset_jsonld = {
        '@context': 'https://schema.org', '@type': 'Dataset',
        'name': 'WCAG by Role: WCAG 2.2 and ARRM task data',
        'description': 'Normalized WCAG 2.2 success criterion references and original W3C ARRM task-level responsibility assignments. Independent project, not W3C-endorsed.',
        'url': url(base, 'data/'), 'inLanguage': 'en', 'dateModified': snapshot[:10],
        'isBasedOn': [WCAG_URL, ARRM_URL],
        'isAccessibleForFree': True,
        'distribution': [{'@type': 'DataDownload', 'name': d['name'], 'contentUrl': d['contentUrl'],
                          'encodingFormat': d['encodingFormat']} for d in manifest['distributions']],
    }
    page(dest, p, base=base, title='Download WCAG by Role data',
         description='Download WCAG by Role source references and task responsibility data in JSON, YAML and CSV, with provenance and licensing details.',
         content=content, breadcrumb=[('Home', 'index.html')], jsonld=dataset_jsonld, snapshot=snapshot)
    pages.append(p)
    return pages


def make_sitemap(dest, pages, base, snapshot):
    root = Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
    for path in sorted(set(pages)):
        node = SubElement(root, 'url')
        SubElement(node, 'loc').text = url(base, path.removesuffix('index.html'))
        SubElement(node, 'lastmod').text = snapshot[:10]
    xml = b'<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(root, encoding='utf-8') + b'\n'
    (dest / 'sitemap.xml').write_bytes(xml)


def add_head_metadata(dest, base, snapshot):
    """Add discoverability to copied app shells, without changing web/ source files."""
    for filename, canonical, noindex in [
        ('index.html', url(base), False),
        ('role.html', url(base, 'roles/'), True),
    ]:
        p = dest / filename
        if not p.is_file():
            continue
        src = p.read_text('utf-8')
        if 'name="wcag-discovery-build"' not in src:
            extra = (f'<meta name="wcag-discovery-build" content="{e(snapshot[:10])}">\n'
                     f'<link rel="canonical" href="{e(canonical)}">\n')
            if noindex:
                extra += '<meta name="robots" content="noindex,follow">\n'
            else:
                extra += '<link rel="alternate" type="application/json" href="./data/role-data.json">\n'
                extra += '<link rel="sitemap" type="application/xml" href="./sitemap.xml">\n'
                extra += '<link rel="icon" type="image/png" sizes="48x48" href="./favicon-48.png">\n'
                extra += '<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">\n'
                extra += '<link rel="manifest" href="./site.webmanifest">\n'
                extra += f'<meta property="og:url" content="{e(canonical)}">\n'
                extra += '<meta property="og:type" content="website">\n'
                extra += '<meta property="og:title" content="WCAG by Role">\n'
                extra += '<meta property="og:image" content="' + e(url(base, 'social-card.png')) + '">\n'
                extra += '<meta name="twitter:card" content="summary_large_image">\n'
                homepage_schema = {
                    '@context': 'https://schema.org', '@type': 'WebSite',
                    'name': 'WCAG by Role', 'url': base, 'inLanguage': 'en',
                    'description': 'Explore WCAG 2.2 and original W3C ARRM task assignments by professional role.',
                    'dateModified': snapshot[:10], 'isBasedOn': [WCAG_URL, ARRM_URL],
                }
                extra += '<script type="application/ld+json">' + json_script(homepage_schema) + '</script>\n'
            src = src.replace('</head>', extra + '</head>', 1)
        if filename == 'index.html':
            src = src.replace('Task-oriented guides for visual designers and front-end developers.',
                              'Task-oriented guides for business analysts, content authors, UX designers, visual designers and front-end developers.')
            anchor = '<div id="role-guides-list"></div>'
            if anchor in src and 'data-static-discovery-link' not in src:
                src = src.replace(anchor, '<p data-static-discovery-link="true"><a href="./roles/">Browse indexable role guides and original task records</a></p>\n' + anchor, 1)
            if 'data-static-discovery-indexes' not in src:
                guide = ('<nav data-static-discovery-indexes="true" aria-label="Static references">'
                         '<a href="./criteria/">All success criteria</a> · '
                         '<a href="./tasks/">ARRM task index</a> · '
                         '<a href="./data/">Data downloads</a></nav>')
                src = src.replace('</main>', guide + '\n</main>', 1)
        p.write_text(src, encoding='utf-8')


def llms_text(base, data):
    return f'''# WCAG by Role

> Independent, open-source navigation and role interpretation over W3C WCAG 2.2 and Accessibility Roles and Responsibilities Mapping (ARRM). Not official W3C guidance. Role-based assignments are advisory; no role filter reduces WCAG conformance requirements.

## Human-readable indexes
- [All WCAG 2.2 success criteria]({url(base, 'criteria/')})
- [ARRM task index]({url(base, 'tasks/')})
- [Five professional role guides]({url(base, 'roles/')})
- [Data downloads and licences]({url(base, 'data/')})

## Machine-readable distributions
- [Normalized role data (JSON)]({url(base, 'data/role-data.json')})
- [Dataset manifest and source hashes]({url(base, 'data/manifest.json')})
- [Task-level role comparison (CSV)]({url(base, 'data/role-matrix.csv')})
- [Sitemap]({url(base, 'sitemap.xml')})

## Authoritative sources
- [WCAG 2.2]({WCAG_URL})
- [W3C ARRM tasks]({ARRM_URL})

This file is an optional navigation aid, not an official search-engine or AI indexing protocol. Do not treat this project's role-specific content as W3C normative text.
'''


def publish(dist: Path, source_yaml: Path | None, base: str, repo_root: Path) -> dict:
    base = base_url(base)
    path = dist / 'data/role-data.json'
    data = json.loads(path.read_text('utf-8'))
    sc_index = collect_source(data)
    snapshot = str(data.get('generatedAt', ''))
    # Generated timestamps come from the imported data; fail if malformed.
    datetime.fromisoformat(snapshot.replace('Z', '+00:00'))
    yaml_out = copy_yaml(dist, source_yaml, data)
    manifest = build_exports(dist, data, has_yaml=yaml_out, base=base)
    add_project_distributions(dist, repo_root, base, manifest)
    pages = ['index.html', 'credits.html']
    pages += render_criteria(dist, data, sc_index, base=base, snapshot=snapshot)
    pages += render_tasks(dist, data, sc_index, base=base, snapshot=snapshot)
    pages += render_comparison(dist, data, sc_index, base=base, snapshot=snapshot)
    pages += render_roles(dist, data, base=base, snapshot=snapshot, root=repo_root)
    pages += render_indexes(dist, data, manifest, base=base, snapshot=snapshot)
    # Do not advertise pages that do not exist in the built distribution.
    pages = [p for p in pages if (dist / p).is_file()]
    if data.get('mode') == 'demo':
        for filename in pages:
            # Production-only indexing: demonstration records are intentionally incomplete.
            if filename in ('index.html', 'credits.html'):
                continue
            doc = dist / filename
            html = doc.read_text('utf-8')
            html = html.replace('</head>', '<meta name="robots" content="noindex,follow">\n</head>', 1)
            html = html.replace('<main class="wrap" id="main">',
                '<main class="wrap" id="main"><p class="demo-warning"><strong>Demonstration data.</strong> '
                'This page contains an intentionally incomplete local sample; do not treat it as the production WCAG or ARRM inventory.</p>', 1)
            doc.write_text(html, encoding='utf-8')
    make_sitemap(dist, pages, base, snapshot)
    add_head_metadata(dist, base, snapshot)
    write(dist, 'llms.txt', llms_text(base, data))
    write(dist, 'data/dataset.jsonld', json.dumps({
        '@context': 'https://schema.org', '@type': 'Dataset',
        'name': 'WCAG by Role: WCAG 2.2 and ARRM task data',
        'url': url(base, 'data/'), 'isBasedOn': [WCAG_URL, ARRM_URL],
        'dateModified': snapshot[:10],
        'distribution': [{'@type': 'DataDownload', 'contentUrl': d['contentUrl'],
                          'encodingFormat': d['encodingFormat']} for d in manifest['distributions']]
    }, indent=2, ensure_ascii=False) + '\n')
    report = {'baseUrl': base, 'criteria': len(data['criteria']), 'tasks': len(data['tasks']),
              'roleGuides': len(ROLE_ORDER), 'htmlPages': len(pages), 'sitemap': url(base, 'sitemap.xml'),
              'yamlPublished': yaml_out, 'mode': data.get('mode')}
    write(dist, 'data/discovery-build.json', json.dumps(report, indent=2) + '\n')
    return report


def main() -> int:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--dist', type=Path, default=Path('dist'))
    cli.add_argument('--source-yaml', type=Path, help='Canonical YAML snapshot matching dist/data/role-data.json')
    cli.add_argument('--base-url', default='https://mgifford.github.io/WCAG_by_Role/',
                     help='Public site URL, including project path when using GitHub Pages')
    cli.add_argument('--repo-root', type=Path, default=Path('.'))
    args = cli.parse_args()
    report = publish(args.dist, args.source_yaml, args.base_url, args.repo_root)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
