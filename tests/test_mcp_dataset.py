"""Regression tests for the build-time MCP dataset bundle.

These tests do not start the Worker; `cloudflare-mcp/pnpm test` covers the
protocol. They enforce that the MCP bundle comes from the canonical production
snapshot and can never be built from demo fixtures.
"""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'cloudflare-mcp' / 'scripts' / 'build_dataset.py'
SOURCE = ROOT / 'data' / 'source' / 'role-data.yaml'

spec = importlib.util.spec_from_file_location('build_mcp_dataset', SCRIPT)
assert spec and spec.loader
build = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = build
spec.loader.exec_module(build)


class McpDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with SOURCE.open(encoding='utf-8') as handle:
            cls.raw = yaml.safe_load(handle)

    def test_canonical_snapshot_validates_with_expected_counts(self):
        data = build.validate(copy.deepcopy(self.raw))
        self.assertEqual(data['mode'], 'production')
        self.assertEqual(data['schemaVersion'], 3)
        self.assertEqual(len(data['criteria']), 86)
        self.assertEqual(len(data['tasks']), 262)
        self.assertEqual(len(data['roles']), 5)
        self.assertEqual(len(set(data['roles'])), 5)

    def test_demo_snapshot_is_rejected(self):
        demo = copy.deepcopy(self.raw)
        demo['mode'] = 'demo'
        with self.assertRaises(build.BuildError) as caught:
            build.validate(demo)
        self.assertIn('non-production', str(caught.exception))

    def test_unknown_role_is_rejected(self):
        broken = copy.deepcopy(self.raw)
        broken['tasks'][0]['ownership']['primary'].append('Imaginary Role')
        with self.assertRaises(build.BuildError) as caught:
            build.validate(broken)
        self.assertIn('unknown role', str(caught.exception))

    def test_task_must_reference_a_known_criterion(self):
        broken = copy.deepcopy(self.raw)
        broken['tasks'][0]['criterion'] = '9.9.9'
        with self.assertRaises(build.BuildError) as caught:
            build.validate(broken)
        self.assertIn('unknown criterion', str(caught.exception))

    def test_content_comparison_ignores_only_the_import_timestamp(self):
        data = build.validate(copy.deepcopy(self.raw))
        other = copy.deepcopy(data)
        other['generatedAt'] = '2026-11-13T20:04:54.487618+00:00'
        self.assertEqual(build.content_bytes(data), build.content_bytes(other))
        changed = copy.deepcopy(data)
        changed['tasks'][0]['text'] = 'Changed wording'
        self.assertNotEqual(build.content_bytes(data), build.content_bytes(changed))

    def test_metadata_hash_matches_rendered_dataset(self):
        data = build.validate(copy.deepcopy(self.raw))
        dataset_bytes = build.canonical_bytes(data)
        meta = build.build_meta(data, dataset_bytes, 'https://example.test/base/', 'https://example.test/repo')
        rendered_dataset, rendered_meta = build.render(data, meta)
        self.assertEqual(meta['dataset']['sha256'], hashlib.sha256(rendered_dataset).hexdigest())
        self.assertEqual(meta['dataset']['counts'], {'criteria': 86, 'tasks': 262, 'roles': 5})
        self.assertEqual(json.loads(rendered_meta.decode('utf-8'))['server']['name'], 'wcag-by-role-mcp')
        self.assertFalse(meta['attribution']['w3cEndorsed'])
        self.assertFalse(meta['guidancePolicy']['reviewedRoleGuidanceAvailable'])
        self.assertTrue(all(url.startswith('https://example.test/base/') for url in
                            (item['url'] for item in meta['distributions'])))

    def test_generated_bundle_matches_source_when_present(self):
        out = ROOT / 'cloudflare-mcp' / 'src' / 'generated'
        if not (out / 'dataset.json').is_file() or not (out / 'meta.json').is_file():
            self.skipTest('generated bundle not built yet; run cloudflare-mcp/scripts/build_dataset.py')
        existing_meta = json.loads((out / 'meta.json').read_text(encoding='utf-8'))
        data = build.validate(copy.deepcopy(self.raw))
        dataset_bytes = build.canonical_bytes(data)
        meta = build.build_meta(data, dataset_bytes, existing_meta['distributionBaseUrl'],
                                existing_meta['projectUrl'])
        expected_dataset, expected_meta = build.render(data, meta)
        self.assertEqual((out / 'dataset.json').read_bytes(), expected_dataset)
        self.assertEqual((out / 'meta.json').read_bytes(), expected_meta)


if __name__ == '__main__':
    unittest.main()
