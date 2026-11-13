import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from pipeline import build
from source_schema import validate_source
from migrate_source import dump_yaml, load_yaml, migrate

HASHES = {key: 'a' * 64 for key in ('wcag', 'tasks', 'responsibilities')}


class YamlSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture = ROOT / 'fixtures'
        wcag = json.loads((fixture / 'wcag.json').read_text(encoding='utf-8'))
        tasks = (fixture / 'arrm-all-tasks.csv').read_text(encoding='utf-8')
        summaries = (fixture / 'arrm-wcag-sc.csv').read_text(encoding='utf-8')
        briefs = json.loads((fixture / 'understanding.json').read_text(encoding='utf-8'))
        cls.demo, _ = build(wcag, tasks, summaries, mode='demo', briefs=briefs)
        cls.demo['sourceSHA256'] = HASHES
        cls.snapshot = load_yaml(ROOT / 'data' / 'source' / 'role-data.yaml')

    def test_committed_snapshot_is_valid_production_source(self):
        errors = validate_source(self.snapshot, expected_counts={'criteria': 86, 'tasks': 262, 'roles': 5},
                                 require_production=True)
        self.assertEqual(errors, [])
        self.assertEqual(self.snapshot['mode'], 'production')
        self.assertNotIn('4.1.1', {c['number'] for c in self.snapshot['criteria']})
        self.assertNotIn('4.1.1', {t['criterion'] for t in self.snapshot['tasks']})
        self.assertEqual(set(self.snapshot['sourceSHA256']), {'wcag', 'tasks', 'responsibilities'})

    def test_demo_round_trip_preserves_all_data(self):
        errors = validate_source(self.demo)
        self.assertEqual(errors, [])
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            input_path = directory / 'role-data.json'
            yaml_path = directory / 'role-data.yaml'
            output_path = directory / 'role-data.out.json'
            input_path.write_text(json.dumps(self.demo, ensure_ascii=False), encoding='utf-8')
            self.assertEqual(migrate(input_path, yaml_path, output_path), 0)
            self.assertEqual(load_yaml(yaml_path), self.demo)
            self.assertEqual(json.loads(output_path.read_text(encoding='utf-8')), self.demo)
            self.assertEqual(migrate(input_path, yaml_path, check=True), 0)

    def test_schema_contract_loads(self):
        schema = yaml.safe_load((ROOT / 'schemas' / 'role-data.schema.yaml').read_text(encoding='utf-8'))
        self.assertEqual(schema['$schema'], 'https://json-schema.org/draft/2020-12/schema')
        self.assertIn('criteria', schema['properties'])
        self.assertIn('tasks', schema['properties'])
        self.assertIn('sourceSHA256', schema['properties'])

    def test_retired_criterion_and_unknown_task_reference_are_rejected(self):
        data = copy.deepcopy(self.demo)
        data['criteria'].append({
            'number': '4.1.1', 'slug': 'parsing', 'name': 'Parsing', 'level': 'A',
            'normativeUrl': 'https://www.w3.org/TR/WCAG22/#parsing',
            'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/parsing.html',
            'arrmResponsibilities': {}, 'criterionSummaryStatus': 'missing',
            'inBrief': {}, 'mapped': False,
        })
        errors = validate_source(data)
        self.assertTrue(any('4.1.1' in error for error in errors))

        data = copy.deepcopy(self.demo)
        data['tasks'][0]['criterion'] = '9.9.9'
        errors = validate_source(data)
        self.assertTrue(any('unknown criterion' in error for error in errors))

    def test_duplicate_ids_are_rejected(self):
        data = copy.deepcopy(self.demo)
        data['tasks'].append(copy.deepcopy(data['tasks'][0]))
        errors = validate_source(data)
        self.assertTrue(any('duplicate task id' in error for error in errors))
