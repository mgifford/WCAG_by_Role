import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from pipeline import (build, csv_records, extract_brief, normalize_summaries,
                      normalize_tasks, normalize_wcag, parse_roles)


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture = ROOT / 'fixtures'
        cls.wcag = json.loads((fixture / 'wcag.json').read_text(encoding='utf-8'))
        cls.tasks = (fixture / 'arrm-all-tasks.csv').read_text(encoding='utf-8')
        cls.summary = (fixture / 'arrm-wcag-sc.csv').read_text(encoding='utf-8')

    def test_csv_embedded_escaped_quotes(self):
        rows = csv_records(self.tasks)
        self.assertEqual(rows[0]['Task'], 'Informative alternate text is provided for images (i.e. not "spacer" or image file name).')

    def test_multiple_roles_and_none(self):
        self.assertEqual(parse_roles('Visual Design, Content Authoring, Visual Design'), ['Visual Design', 'Content Authoring'])
        self.assertEqual(parse_roles('none'), [])

    def test_excludes_removed_criterion_from_wcag22(self):
        criteria, retired = normalize_wcag(self.wcag)
        self.assertNotIn('4.1.1', {c['number'] for c in criteria})
        self.assertEqual([x['number'] for x in retired], ['4.1.1'])

    def test_task_level_primary_and_secondary_separate(self):
        criteria, _ = normalize_wcag(self.wcag)
        tasks, rejected = normalize_tasks(csv_records(self.tasks), {c['number'] for c in criteria})
        focus = {t['id']: t for t in tasks if t['criterion'] == '2.4.7'}
        self.assertIn('Visual Design', focus['INP-017']['ownership']['primary'])
        self.assertIn('Front-End Development', focus['INP-018']['ownership']['primary'])
        self.assertIn('Visual Design', focus['INP-018']['ownership']['secondary'])
        self.assertIn('SEM-024', [x['id'] for x in rejected])

    def test_summary_does_not_replace_task_ownership(self):
        summaries, rejected = normalize_summaries(csv_records(self.summary), {'2.4.7'})
        self.assertEqual(summaries['2.4.7']['Visual Design'], ['primary', 'secondary'])
        self.assertTrue(any(r['criterion'] == '4.1.1' for r in rejected))

    def test_exact_in_brief_text(self):
        html = ('<h2 id="brief">In Brief</h2><dl><dt>Goal</dt><dd>See <em>focus</em>.</dd>'
                '<dt>What to do</dt><dd>Provide visible focus.</dd>'
                "<dt>Why it's important</dt><dd>Keyboard users need it.</dd></dl>"
                '<h2 id="intent">Intent</h2><dl><dt>Goal</dt><dd>Do not include</dd></dl>')
        self.assertEqual(extract_brief(html), {
            'goal': 'See focus.', 'whatToDo': 'Provide visible focus.',
            'whyImportant': 'Keyboard users need it.'})

    def test_build_records_provenance_and_unmapped(self):
        data, audit = build(self.wcag, self.tasks, self.summary, mode='demo')
        self.assertEqual(data['mode'], 'demo')
        self.assertIn('2.1.1', audit['unmappedCriteria'])
        self.assertEqual(audit['retiredWCAG'][0]['number'], '4.1.1')
        self.assertEqual(len([a for a in audit['excludedARRM'] if a.get('criterion') == '4.1.1']), 2)
        self.assertIn('Front-End Development', data['roles'])

    def test_fail_closed_when_production_data_incomplete(self):
        with self.assertRaisesRegex(ValueError, 'Incomplete production dataset'):
            build(self.wcag, self.tasks, self.summary, mode='production')

    def test_invalid_criterion_structure_raises(self):
        with self.assertRaises(ValueError):
            normalize_wcag({'principles': {}})

    def test_unknown_criterion_is_reported(self):
        criteria, _ = normalize_wcag(self.wcag)
        tasks, rejected = normalize_tasks(csv_records(self.tasks + 'BAD-001,9.9.9,AA,Fictional criterion.,Design,,Visual Design,none,none\n'),
                                          {c['number'] for c in criteria})
        self.assertTrue(any(x['id'] == 'BAD-001' for x in rejected))

if __name__ == '__main__':
    unittest.main()
