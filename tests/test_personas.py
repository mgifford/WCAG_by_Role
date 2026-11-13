import csv
import hashlib
import json
import struct
import sys
import unittest
from pathlib import Path
import jsonschema
import yaml
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from export_personas import build, csv_safe

class PersonasTest(unittest.TestCase):
    def test_personas_complete_unique_and_machine_readable(self):
        people=build(ROOT)
        self.assertEqual(len(people),5)
        self.assertEqual(len({x['avatar']['seed'] for x in people}),5)
        self.assertEqual(len({x['avatar']['url'] for x in people}),5)
        self.assertEqual(len({x['roleSlug'] for x in people}),5)
        self.assertTrue(all(x['researchStatus']=='unvalidated-draft' for x in people))

    def test_personas_have_profile_references(self):
        for p in (ROOT/'data/personas').glob('*.yaml'):
            persona=yaml.safe_load(p.read_text())
            role_path=ROOT/'data/role-profiles'/(persona['roleSlug']+'.yaml')
            profile=yaml.safe_load(role_path.read_text())
            self.assertEqual(profile['personaRef'],f'../personas/{persona["id"]}.yaml')

    def test_all_robots_have_one_consistent_genre(self):
        people = build(ROOT)
        self.assertEqual({p['avatar']['set'] for p in people}, {'set1'})
        self.assertEqual({p['avatar']['genre'] for p in people}, {'classic-robot'})
        self.assertEqual({p['avatar']['size'] for p in people}, {'400x400'})
        for p in people:
            avatar = p['avatar']
            expected = (f"https://robohash.org/{avatar['seed']}.png"
                        f"?set=set1&size=400x400")
            self.assertEqual(avatar['url'], expected)
            self.assertEqual(avatar['localPath'], f"web/assets/personas/{p['id']}.png")
            self.assertEqual(avatar['assetStatus'], 'cached')
            self.assertRegex(avatar['sha256'], r'^[0-9a-f]{64}$')
            self.assertEqual(avatar['size'], '400x400')
            self.assertEqual(avatar['format'], 'png')

    def test_avatar_manifest_matches_cached_pngs(self):
        manifest = json.loads((ROOT / 'data' / 'exports' / 'avatar-manifest.json').read_text())
        self.assertEqual(manifest['set'], 'set1')
        self.assertEqual(len(manifest['avatars']), 5)
        paths, hashes = set(), set()
        persona_by_id = {}
        for persona_path in (ROOT / 'data' / 'personas').glob('*.yaml'):
            persona = yaml.safe_load(persona_path.read_text())
            persona_by_id[persona['id']] = persona
        for entry in manifest['avatars']:
            path = ROOT / entry['path']
            data = path.read_bytes()
            self.assertTrue(data.startswith(b'\x89PNG\r\n\x1a\n'), path)
            width, height = struct.unpack('>II', data[16:24])
            self.assertEqual((width, height), (400, 400), path)
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'], path)
            self.assertEqual(entry['bytes'], len(data), path)
            persona = persona_by_id[entry['persona']]
            self.assertEqual(persona['avatar']['localPath'], entry['path'])
            self.assertEqual(persona['avatar']['sha256'], entry['sha256'])
            self.assertEqual(persona['avatar']['assetStatus'], 'cached')
            paths.add(entry['path'])
            hashes.add(entry['sha256'])
        self.assertEqual(len(paths), 5)
        self.assertEqual(len(hashes), 5)

    def test_csv_round_trips_and_neutralizes_formulas(self):
        with (ROOT / 'data' / 'exports' / 'personas.csv').open(encoding='utf-8') as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(len(rows), 5)
        for row in rows:
            self.assertIn(' | ', row['goals'])
            self.assertNotIn('\n', row['summary'])
            self.assertEqual(row['avatar_set'], 'set1')
            self.assertEqual(row['avatar_size'], '400x400')
        self.assertEqual(csv_safe('=SUM(A1)'), "'=SUM(A1)")
        self.assertEqual(csv_safe('normal text'), 'normal text')

    def test_schema_rejects_mixed_robot_set_and_missing_attribution(self):
        schema = yaml.safe_load((ROOT / 'schemas' / 'persona.schema.yaml').read_text())
        source = yaml.safe_load((ROOT / 'data' / 'personas' / 'business-blair.yaml').read_text())
        mixed = json.loads(json.dumps(source))
        mixed['avatar']['set'] = 'set3'
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(mixed, schema)
        missing = json.loads(json.dumps(source))
        del missing['avatar']['attribution']
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(missing, schema)

