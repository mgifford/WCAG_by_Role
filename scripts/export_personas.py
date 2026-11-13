#!/usr/bin/env python3
"""Generate browser JSON and CSV from canonical YAML personas. No image network calls."""
from pathlib import Path
import argparse
import csv
import json
import yaml
from jsonschema import validate

ROOT = Path(__file__).resolve().parents[1]
ROLE_SLUGS = ('business-analysis', 'content-authoring', 'user-experience-design',
              'visual-design', 'front-end-development')
ROLE_LABELS = {
    'business-analysis': 'Business Analysis',
    'content-authoring': 'Content Authoring',
    'user-experience-design': 'User Experience (UX) Design',
    'visual-design': 'Visual Design',
    'front-end-development': 'Front-End Development',
}


def csv_safe(value):
    """Neutralize spreadsheet formulas without changing canonical YAML values."""
    if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@')):
        return "'" + value
    return value


def build(root=ROOT):
    schema = yaml.safe_load((root/'schemas/persona.schema.yaml').read_text(encoding='utf-8'))
    people = []
    ids, seeds, roles = set(), set(), set()
    for p in sorted((root/'data/personas').glob('*.yaml')):
        item = yaml.safe_load(p.read_text(encoding='utf-8'))
        validate(item, schema)
        if item['id'] != p.stem:
            raise ValueError(f'Persona id does not match filename: {p}')
        if item['id'] in ids or item['avatar']['seed'] in seeds:
            raise ValueError(f'Duplicate persona id or avatar seed: {p}')
        if item['roleSlug'] in roles:
            raise ValueError(f'Duplicate role slug: {p}')
        if item['arrmRole'] != ROLE_LABELS.get(item['roleSlug']):
            raise ValueError(f"ARRM role label does not match role slug: {p}")
        if not item['avatar']['url'].startswith('https://robohash.org/'):
            raise ValueError(f'Unexpected avatar source: {p}')
        if item['avatar']['seed'] not in item['avatar']['url'] or item['avatar']['set'] not in item['avatar']['url']:
            raise ValueError(f'Avatar seed/set does not match URL: {p}')
        if item['avatar']['decorative'] is not True or item['avatar']['altText'] != '':
            raise ValueError(f'Avatar must be decorative with empty alt text: {p}')
        if item['avatar']['size'] != '400x400' or item['avatar']['format'] != 'png':
            raise ValueError(f'Avatar must be a 400x400 PNG: {p}')
        if item['avatar']['assetStatus'] != 'cached' or not item['avatar'].get('sha256'):
            raise ValueError(f'Avatar asset is not cached: {p}')
        ids.add(item['id']);seeds.add(item['avatar']['seed']);roles.add(item['roleSlug'])
        people.append(item)
    assert roles==set(ROLE_SLUGS), (roles,set(ROLE_SLUGS))
    output=root/'data/exports'
    output.mkdir(exist_ok=True,parents=True)
    rows=[]
    for d in people:
        rows.append({
         'persona_id':d['id'],'role_slug':d['roleSlug'],'arrm_role':d['arrmRole'],
         'name':d['name'],'research_status':d['researchStatus'],
         'summary':d['summary'],'scenario':d['scenario'],
         'goals':' | '.join(d['goals']),'needs':' | '.join(d['needs']),
         'thoughts':' | '.join(d['thoughts']),'feelings':' | '.join(d['feelings']),
         'behaviors':' | '.join(d['behaviors']),'pain_points':' | '.join(d['painPoints']),
         'access_context':d['accessContext'],
         'communication_framing':d['preferredCommunication']['framing'],
         'preferred_vocabulary':' | '.join(d['preferredCommunication']['vocabulary']),
         'example_types':' | '.join(d['preferredCommunication']['exampleTypes']),
         'success_signal':d['preferredCommunication']['successSignal'],
         'avatar_url':d['avatar']['url'], 'avatar_seed':d['avatar']['seed'],
         'avatar_set':d['avatar']['set'], 'avatar_local_path':d['avatar']['localPath'],
         'avatar_format':d['avatar']['format'], 'avatar_size':d['avatar']['size'],
         'avatar_sha256':d['avatar']['sha256'], 'avatar_asset_status':d['avatar']['assetStatus'],
         'avatar_license':d['avatar']['license'], 'avatar_attribution':d['avatar']['attribution']})
    path=output/'personas.csv'
    with path.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]))
        w.writeheader()
        for row in rows:
            # Neutralize spreadsheet formula injection for text fields on CSV export.
            w.writerow({k: csv_safe(v) for k, v in row.items()})
    (output/'personas.json').write_text(json.dumps({'schemaVersion':'1.0.0','personas':people},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return people

if __name__=='__main__':
    people=build()
    print('Validated and exported', len(people), 'personas')
