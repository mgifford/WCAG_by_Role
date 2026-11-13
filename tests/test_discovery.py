"""Offline discovery tests. Does not start, deploy, or validate any MCP server."""
import csv
from io import StringIO
import json
from pathlib import Path
import tempfile
import unittest
from xml.etree import ElementTree

from scripts import publish_discovery as discovery


def sample_data():
    criteria = [
        {'number': '1.1.1', 'slug': 'non-text-content', 'name': 'Non-text Content', 'level': 'A',
         'principle': 'Perceivable', 'guideline': '1.1 Text Alternatives', 'summary': 'Text alternatives are provided.',
         'normativeUrl': 'https://www.w3.org/TR/WCAG22/#non-text-content',
         'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
         'inBrief': {'goal': 'Text alternatives are available.'}},
        {'number': '2.4.7', 'slug': 'focus-visible', 'name': 'Focus Visible', 'level': 'AA',
         'principle': 'Operable', 'guideline': '2.4 Navigable', 'summary': 'Focus is visible.',
         'normativeUrl': 'https://www.w3.org/TR/WCAG22/#focus-visible',
         'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html'},
        {'number': '3.3.8', 'slug': 'accessible-authentication-minimum', 'name': 'Accessible Authentication (Minimum)',
         'level': 'AA', 'principle': 'Understandable', 'guideline': '3.3 Input Assistance',
         'summary': 'Accessible authentication is available.',
         'normativeUrl': 'https://www.w3.org/TR/WCAG22/#accessible-authentication-minimum',
         'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html'},
    ]
    tasks = [
        {'id': 'IMG-001', 'criterion': '1.1.1', 'text': 'Provide useful text alternatives.',
         'ownership': {'primary': ['Content Authoring'], 'secondary': ['User Experience (UX) Design'], 'contributor': []}},
        {'id': 'INP-017', 'criterion': '2.4.7', 'text': 'Design a visible focus indicator.',
         'ownership': {'primary': ['Visual Design'], 'secondary': ['Front-End Development'], 'contributor': []}},
        {'id': 'INP-018', 'criterion': '2.4.7', 'text': 'Implement a focus indicator.',
         'ownership': {'primary': ['Front-End Development'], 'secondary': ['Visual Design'],
                       'contributor': ['Business Analysis']}},
    ]
    return {
        'schemaVersion': 3, 'wcagVersion': '2.2', 'mode': 'demo',
        'generatedAt': '2026-11-13T18:00:00+00:00',
        'criteria': criteria, 'tasks': tasks,
        'roles': [entry[1] for entry in discovery.ROLE_ORDER],
        'sources': {'wcag': discovery.WCAG_URL, 'tasks': discovery.ARRM_URL},
        'sourceSHA256': {'wcag': 'abc123'},
    }


class DiscoveryBuildTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dist = self.root / 'dist'
        (self.dist / 'data').mkdir(parents=True)
        (self.dist / 'data/role-data.json').write_text(json.dumps(sample_data()), encoding='utf-8')
        (self.dist / 'data/import-audit.json').write_text('{}', encoding='utf-8')
        (self.dist / 'index.html').write_text('<html><head></head><body><main>Task-oriented guides for visual designers and front-end developers.<div id="role-guides-list"></div></main></body></html>', encoding='utf-8')
        (self.dist / 'credits.html').write_text('<html><head></head><body>Attribution</body></html>', encoding='utf-8')
        (self.dist / 'role.html').write_text('<html><head></head><body>Interactive role guide</body></html>', encoding='utf-8')

    def run_build(self):
        return discovery.publish(self.dist, None, 'https://mgifford.github.io/WCAG_by_Role/', self.root)

    def test_static_pages_and_sitemap(self):
        report = self.run_build()
        self.assertEqual(report['criteria'], 3)
        self.assertEqual(report['tasks'], 3)
        self.assertEqual(report['roleGuides'], 5)
        for path in ('criteria/1-1-1-non-text-content/index.html', 'tasks/INP-017/index.html',
                     'compare/2-4-7/index.html', 'roles/visual-design/index.html',
                     'data/index.html', 'roles/index.html', 'sitemap.xml', 'llms.txt'):
            self.assertTrue((self.dist / path).is_file(), path)
        tree = ElementTree.parse(self.dist/'sitemap.xml')
        locs = [node.text for node in tree.findall('.//{*}loc')]
        self.assertIn('https://mgifford.github.io/WCAG_by_Role/criteria/2-4-7-focus-visible/', locs)
        self.assertEqual(len(locs), report['htmlPages'])
        self.assertFalse(any('4-1-1' in x for x in locs))
        self.assertEqual(len(locs), len(set(locs)))

    def test_authorship_and_ownership_not_invented(self):
        self.run_build()
        task = (self.dist/'tasks/INP-017/index.html').read_text('utf-8')
        self.assertIn('Design a visible focus indicator.', task)
        self.assertIn('Visual Design', task)
        self.assertIn('None recorded', task)
        self.assertIn('not W3C guidance', task)
        compare = (self.dist/'compare/2-4-7/index.html').read_text('utf-8')
        self.assertIn('Not recorded', compare)
        self.assertIn('INP-017', compare)
        self.assertIn('INP-018', compare)
        self.assertNotIn('<script src=', compare)
        role = (self.dist/'roles/content-authoring/index.html').read_text('utf-8')
        self.assertIn('Task categories', role)
        self.assertIn('Images and Graphs', role)
        self.assertIn('1.1.1 Non-text Content', role)
        self.assertIn('Provide useful text alternatives.', role)
        self.assertIn('Related tasks and source (1)', role)
        self.assertIn('IMG-001', role)

    def test_metadata_and_csv(self):
        self.run_build()
        page = (self.dist/'criteria/2-4-7-focus-visible/index.html').read_text('utf-8')
        self.assertIn('rel="canonical"', page)
        self.assertIn('application/ld+json', page)
        self.assertIn('focus-visible', page)
        dataset = (self.dist/'data/index.html').read_text('utf-8')
        self.assertIn('"@type": "Dataset"', dataset)
        matrix = list(csv.DictReader(StringIO((self.dist/'data/role-matrix.csv').read_text('utf-8'))))
        self.assertEqual(len(matrix), 3)
        row = next(row for row in matrix if row['task_id'] == 'INP-017')
        self.assertEqual(row['visual-design'], 'primary')
        self.assertEqual(row['business-analysis'], 'not recorded')
        index = (self.dist/'index.html').read_text('utf-8')
        self.assertIn('Browse indexable role guides', index)
        self.assertIn('business analysts, content authors', index)
        role = (self.dist/'role.html').read_text('utf-8')
        self.assertIn('noindex,follow', role)

    def test_reject_incomplete_production(self):
        raw = sample_data()
        raw['mode'] = 'production'
        (self.dist/'data/role-data.json').write_text(json.dumps(raw), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Production data is incomplete'):
            self.run_build()

    def test_reject_unmatched_yaml(self):
        try:
            import yaml
        except ImportError:
            self.skipTest('PyYAML unavailable')
        source = self.root/'role-data.yaml'
        source.write_text(yaml.safe_dump({'criteria': []}), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'YAML snapshot differs'):
            discovery.publish(self.dist, source, 'https://mgifford.github.io/WCAG_by_Role/', self.root)

    def test_project_personas_and_profiles_are_published_without_inference(self):
        (self.root/'data/exports').mkdir(parents=True)
        (self.root/'data/role-profiles').mkdir(parents=True)
        (self.root/'data/personas').mkdir(parents=True)
        (self.root/'schemas').mkdir(parents=True)
        (self.root/'data/exports/personas.json').write_text('{"personas": []}', encoding='utf-8')
        (self.root/'data/exports/personas.csv').write_text('id,name\nexample,Test\n', encoding='utf-8')
        (self.root/'data/role-profiles/visual-design.yaml').write_text('id: visual-design\n', encoding='utf-8')
        (self.root/'data/personas/visual-val.yaml').write_text('id: visual-val\n', encoding='utf-8')
        (self.root/'schemas/persona.schema.yaml').write_text('type: object\n', encoding='utf-8')
        self.run_build()
        for path in ('data/personas.json', 'data/personas.csv',
                     'data/role-profiles/visual-design.yaml', 'data/personas/visual-val.yaml',
                     'data/schemas/persona.schema.yaml'):
            self.assertTrue((self.dist/path).exists(), path)
        manifest = json.loads((self.dist/'data/manifest.json').read_text('utf-8'))
        self.assertTrue(any(d['contentUrl'].endswith('/data/personas.json') for d in manifest['distributions']))
        data_page = (self.dist/'data/index.html').read_text('utf-8')
        self.assertIn('role-profiles/visual-design.yaml', data_page)
        self.assertIn('personas/visual-val.yaml', data_page)

    def test_url_validation(self):
        for bad in ('http://example.com/', 'https://example.com/a/../b', 'https://u:secret@example.com/',
                    'https://example.com/?q=1'):
            with self.assertRaises(ValueError):
                discovery.base_url(bad)
        self.assertEqual(discovery.relative('roles/visual-design/index.html', 'index.html'), '../../')
        self.assertEqual(discovery.relative('criteria/index.html', 'criteria/2-4-7-focus-visible/index.html'),
                         '2-4-7-focus-visible/')

    def test_csv_formula_escape(self):
        self.assertEqual(discovery.csv_cell('=1+1'), "'=1+1")
        self.assertEqual(discovery.csv_cell('Normal content'), 'Normal content')
        self.assertEqual(discovery.csv_cell('  @HYPERLINK'), "'  @HYPERLINK")


if __name__ == '__main__':
    unittest.main()
