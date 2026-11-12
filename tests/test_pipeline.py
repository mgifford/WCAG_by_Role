import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from pipeline import (build, canonical_role, csv_records, extract_brief, normalize_summaries,
                      normalize_tasks, normalize_wcag, parse_roles, validate_csv_headers)


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
        self.assertEqual(parse_roles('N/A'), [])

    def test_role_aliases_are_explicit_and_canonical(self):
        self.assertEqual(canonical_role('Front End Development'), 'Front-End Development')
        self.assertEqual(canonical_role('Front-End Developement'), 'Front-End Development')
        self.assertEqual(canonical_role('User Experience (UX)'), 'User Experience (UX) Design')
        self.assertEqual(canonical_role('Design Visual Design'), 'Visual Design')
        self.assertEqual(canonical_role('Business'), 'Business Analysis')
        self.assertEqual(canonical_role('QA Testing'), 'QA Testing')

    def test_excludes_removed_criterion_from_wcag22(self):
        criteria, retired = normalize_wcag(self.wcag)
        self.assertNotIn('4.1.1', {c['number'] for c in criteria})
        self.assertEqual([x['number'] for x in retired], ['4.1.1'])

    def test_task_level_primary_and_secondary_separate(self):
        criteria, _ = normalize_wcag(self.wcag)
        tasks, rejected, mismatches = normalize_tasks(
            csv_records(self.tasks), {c['number'] for c in criteria},
            retired_numbers={'4.1.1'},
            criterion_levels={c['number']: c['level'] for c in criteria})
        focus = {t['id']: t for t in tasks if t['criterion'] == '2.4.7'}
        self.assertIn('Visual Design', focus['INP-017']['ownership']['primary'])
        self.assertIn('Front-End Development', focus['INP-018']['ownership']['primary'])
        self.assertIn('Visual Design', focus['INP-018']['ownership']['secondary'])
        self.assertEqual(mismatches, [])
        self.assertIn('SEM-024', [x['id'] for x in rejected])
        self.assertEqual(rejected[0]['reason'], 'Criterion is retired or removed in WCAG 2.2')

    def test_summary_does_not_replace_task_ownership(self):
        summaries, rejected, unknown = normalize_summaries(csv_records(self.summary), {'2.4.7'})
        self.assertEqual(summaries['2.4.7']['Visual Design'], ['primary', 'secondary'])
        self.assertTrue(any(r['criterion'] == '4.1.1' for r in rejected))
        self.assertEqual(unknown, [])

    def test_exact_in_brief_text(self):
        html = ('<h2 id="brief">In Brief</h2><dl><dt>Goal</dt><dd>See <em>focus</em>.</dd>'
                '<dt>What to do</dt><dd>Provide visible focus.</dd>'
                "<dt>Why it's important</dt><dd>Keyboard users need it.</dd></dl>"
                '<h2 id="intent">Intent</h2><dl><dt>Goal</dt><dd>Do not include</dd></dl>')
        self.assertEqual(extract_brief(html), {
            'goal': 'See focus.', 'whatToDo': 'Provide visible focus.',
            'whyImportant': 'Keyboard users need it.'})

    def test_in_brief_supports_alternate_layout_and_author_task_label(self):
        html = ('<section id="brief"><h3>IN BRIEF</h3><dl>'
                '<dt>Goal</dt><dd>Users can read text.</dd>'
                '<dt>Author task</dt><dd>Let text spacing change.</dd>'
                '<dt>Why it’s important</dt><dd>People need different spacing.</dd>'
                '</dl></section><h3>Intent</h3><dl><dt>Goal</dt><dd>Ignore me</dd></dl>')
        self.assertEqual(extract_brief(html), {
            'goal': 'Users can read text.', 'authorTask': 'Let text spacing change.',
            'whyImportant': 'People need different spacing.'})

    def test_in_brief_handles_nested_markup_and_unknown_labels(self):
        html = ('<h2>In Brief</h2><dl><dt>Goal</dt><dd>One <strong>two</strong> three.</dd>'
                '<dt>What to do</dt><dd>Use <a href="#x">links</a>.</dd>'
                '<dt>Why it is important</dt><dd><p>Because.</p></dd>'
                '<dt>Unexpected label</dt><dd>Not mapped.</dd></dl>')
        self.assertEqual(extract_brief(html), {
            'goal': 'One two three.', 'whatToDo': 'Use links.', 'whyImportant': 'Because.'})

    def test_partial_brief_is_retained_without_inventing_fields(self):
        briefs = {'2.4.7': {'goal': 'Only the goal was parsed.'}}
        partials = [{'criterion': '2.4.7', 'fields': ['goal'], 'reason': 'partial'}]
        data, audit = build(self.wcag, self.tasks, self.summary, mode='demo', briefs=briefs, brief_partials=partials)
        brief = next(sc for sc in data['criteria'] if sc['number'] == '2.4.7')['inBrief']
        self.assertEqual(brief, {'goal': 'Only the goal was parsed.'})
        self.assertEqual(audit['understandingPartialBriefs'], partials)
        self.assertTrue(any('In Brief for 2.4.7 is partial' in warning for warning in audit['warnings']))

    def test_duplicate_task_id_raises(self):
        row = self.tasks.splitlines()[1] + '\n'
        with self.assertRaisesRegex(ValueError, 'Duplicate task ID: IMG-001'):
            normalize_tasks(csv_records(self.tasks + row), {'1.1.1'})

    def test_build_records_provenance_and_unmapped(self):
        data, audit = build(self.wcag, self.tasks, self.summary, mode='demo')
        self.assertEqual(data['mode'], 'demo')
        self.assertEqual(data['schemaVersion'], 2)
        self.assertIn('2.1.1', audit['unmappedCriteria'])
        self.assertIn('2.1.1', audit['criteriaWithoutCriterionSummary'])
        self.assertEqual(audit['retiredWCAG'][0]['number'], '4.1.1')
        self.assertEqual(len([a for a in audit['excludedARRM'] if a.get('criterion') == '4.1.1']), 2)
        self.assertIn('Front-End Development', data['roles'])
        self.assertIn('taskCsvHeaders', audit['sourceSchema'])
        self.assertTrue(any('no ARRM task mapping' in warning for warning in audit['warnings']))
        self.assertNotIn('4.1.1', {task['criterion'] for task in data['tasks']})
        self.assertNotIn('4.1.1', {criterion['number'] for criterion in data['criteria']})

    def test_role_aliases_are_normalized_and_reported_without_rewriting_text(self):
        task_row = ('ALIAS-001,1.4.11,AA,Visible interface component boundaries are clear.,Development,,'
                    'Front End Development,"User Experience (UX)",Design Visual Design\n')
        summary_row = '99,1.4.11,AA,C,,,,\n'
        data, audit = build(self.wcag, self.tasks + task_row, self.summary + summary_row, mode='demo')
        task = next(row for row in data['tasks'] if row['id'] == 'ALIAS-001')
        self.assertEqual(task['text'], 'Visible interface component boundaries are clear.')
        self.assertEqual(task['ownership']['primary'], ['Front-End Development'])
        self.assertEqual(task['ownership']['secondary'], ['User Experience (UX) Design'])
        self.assertIn('Visual Design', task['ownership']['contributor'])
        self.assertNotIn('Front End Development', data['roles'])
        self.assertNotIn('Design Visual Design', data['roles'])
        aliases = {(row['raw'], row['canonical']) for row in audit['roleNormalizations']}
        self.assertIn(('Front End Development', 'Front-End Development'), aliases)
        self.assertIn(('User Experience (UX)', 'User Experience (UX) Design'), aliases)
        self.assertIn(('Business', 'Business Analysis'), aliases)

    def test_task_level_mismatch_is_reported_but_wcag_level_wins(self):
        task_row = 'LEVEL-001,1.4.11,AAA,Wrong task level in source.,Design,,Visual Design,none,none\n'
        data, audit = build(self.wcag, self.tasks + task_row, self.summary, mode='demo')
        self.assertEqual([row for row in data['criteria'] if row['number'] == '1.4.11'][0]['level'], 'AA')
        self.assertEqual(audit['taskLevelMismatches'], [{
            'taskId': 'LEVEL-001', 'criterion': '1.4.11', 'taskLevel': 'AAA', 'criterionLevel': 'AA'}])
        self.assertTrue(any('disagree with the WCAG criterion level' in warning for warning in audit['warnings']))

    def test_unknown_ownership_symbol_is_reported(self):
        summary_row = '99,2.1.1,A,Z,,,,\n'
        _, audit = build(self.wcag, self.tasks, self.summary + summary_row, mode='demo')
        self.assertEqual(audit['unrecognizedOwnershipValues'], [{'criterion': '2.1.1', 'role': 'Business', 'value': 'Z'}])
        self.assertTrue(any('unrecognized ownership symbol' in warning for warning in audit['warnings']))

    def test_missing_required_header_fails_with_source_name(self):
        broken = self.tasks.replace('Primary Ownership', 'Primary', 1)
        with self.assertRaisesRegex(ValueError, 'ARRM task CSV is missing required column\\(s\\): Primary Ownership'):
            build(self.wcag, broken, self.summary, mode='demo')
        with self.assertRaisesRegex(ValueError, 'ARRM criterion responsibility CSV is missing required column\\(s\\): WCAG SC'):
            build(self.wcag, self.tasks, self.summary.replace('WCAG SC', 'SC', 1), mode='demo')

    def test_empty_summary_role_columns_fail(self):
        no_roles = 'ID,WCAG SC,Level\n1,1.1.1,A\n'
        with self.assertRaisesRegex(ValueError, 'has no role columns'):
            build(self.wcag, self.tasks, no_roles, mode='demo')

    def test_fail_closed_when_production_data_incomplete(self):
        with self.assertRaisesRegex(ValueError, 'Incomplete production dataset'):
            build(self.wcag, self.tasks, self.summary, mode='production')

    def test_invalid_criterion_structure_raises(self):
        with self.assertRaises(ValueError):
            normalize_wcag({'principles': {}})

    def test_unknown_criterion_is_reported(self):
        criteria, _ = normalize_wcag(self.wcag)
        tasks, rejected, _ = normalize_tasks(
            csv_records(self.tasks + 'BAD-001,9.9.9,AA,Fictional criterion.,Design,,Visual Design,none,none\n'),
            {c['number'] for c in criteria})
        self.assertTrue(any(x['id'] == 'BAD-001' for x in rejected))
        self.assertEqual(rejected[-1]['reason'], 'No WCAG 2.2 criterion with this number')

    def test_header_validation_helper(self):
        rows = csv_records(self.tasks)
        self.assertEqual(validate_csv_headers(rows, 'ARRM task CSV', ('ID', 'WCAG SC'))[:2], ['ID', 'WCAG SC'])
        with self.assertRaises(ValueError):
            validate_csv_headers([], 'ARRM task CSV', ('ID',))


if __name__ == '__main__':
    unittest.main()
