import json
from pathlib import Path
import re
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from pipeline import normalize_wcag


class IconSpriteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.svg = (ROOT / 'web' / 'wcag22-icons.svg').read_text(encoding='utf-8')
        cls.mapping = json.loads((ROOT / 'web' / 'wcag22-icons-mapping.json').read_text(encoding='utf-8'))
        cls.symbols = re.findall(r'<symbol id="([^"]+)"(?:[^>]*)>', cls.svg)
        cls.records = cls.mapping['mapping']

    def test_sprite_has_all_declared_icons_without_duplicates(self):
        self.assertEqual(len(self.symbols), 99)
        self.assertEqual(len(set(self.symbols)), 99)
        self.assertEqual(len([item for item in self.symbols if item.startswith('sc-')]), 86)
        self.assertEqual(len([item for item in self.symbols if item.startswith('guideline-')]), 13)
        self.assertEqual(len(self.records), 99)
        self.assertEqual(len({item['id'] for item in self.records}), 99)
        self.assertEqual({item['id'] for item in self.records}, set(self.symbols))

    def test_every_success_criterion_has_a_symbol_and_description(self):
        criteria = [item for item in self.records if item['type'] == 'success-criterion']
        self.assertEqual(len(criteria), 86)
        for item in criteria:
            self.assertIn(item['id'], self.symbols, item['number'])
            self.assertRegex(item['number'], r'^\d+\.\d+\.\d+$')
            self.assertTrue(item['icon_description'].strip(), item['number'])
            self.assertTrue(item['url'].startswith('https://www.w3.org/TR/WCAG22/#'), item['number'])
        numbers = {item['number'] for item in criteria}
        self.assertNotIn('4.1.1', numbers)
        self.assertEqual(len(numbers), 86)

    def test_fixture_active_criteria_are_covered(self):
        fixture = json.loads((ROOT / 'fixtures' / 'wcag.json').read_text(encoding='utf-8'))
        active, _ = normalize_wcag(fixture)
        mapped = {item['number'] for item in self.records if item['type'] == 'success-criterion'}
        self.assertEqual({criterion['number'] for criterion in active} - mapped, set())

    def test_sprite_has_no_scripts_or_remote_references(self):
        self.assertNotIn('<script', self.svg.lower())
        self.assertNotRegex(self.svg, r'(?:href|src)="https?://')
        self.assertIn('data-wcag-number=', self.svg)
        self.assertIn('data-wcag-level=', self.svg)


if __name__ == '__main__':
    unittest.main()
