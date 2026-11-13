import copy
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from smoke_site import validate_index, validate_payload, validate_role_shell


def valid_payload():
    hashes = {key: 'a' * 64 for key in ('wcag', 'tasks', 'responsibilities')}
    criteria = [{
        'number': '1.1.1', 'slug': 'non-text-content', 'name': 'Non-text Content',
        'level': 'A', 'principle': 'Perceivable', 'guideline': '1.1 Text Alternatives',
        'normativeUrl': 'https://www.w3.org/TR/WCAG22/#non-text-content',
        'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
        'versions': ['2.0', '2.1', '2.2'], 'summary': 'Text alternatives.',
        'arrmResponsibilities': {'Content Authoring': ['primary']},
        'criterionSummaryStatus': 'recorded',
        'inBrief': {'goal': 'A text alternative is available.'}, 'mapped': True,
    }]
    tasks = [{
        'id': 'IMG-001', 'criterion': '1.1.1', 'text': 'Provide alternate text.',
        'stage': 'Author', 'starter': False,
        'ownership': {'primary': ['Content Authoring'], 'secondary': [], 'contributor': []},
    }]
    data = {
        'mode': 'production', 'schemaVersion': 3, 'wcagVersion': '2.2',
        'criteria': criteria, 'tasks': tasks, 'roles': ['Content Authoring'],
        'sources': {
            'wcag': 'https://www.w3.org/WAI/WCAG22/wcag.json',
            'tasks': 'https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv',
            'responsibilities': 'https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv',
        },
        'sourceSHA256': hashes,
    }
    audit = {
        'mode': 'production', 'schemaVersion': 3,
        'counts': {
            'activeCriteria': 1, 'acceptedTasks': 1, 'roles': 1,
            'retiredWCAG': 1, 'excludedARRM': 1, 'taskLevelMismatches': 0,
            'roleNormalizations': 0, 'understandingBriefs': 1,
        },
        'retiredWCAG': [{'number': '4.1.1', 'name': 'Parsing (Obsolete and removed)'}],
        'excludedARRM': [{'type': 'task', 'id': 'SEM-024', 'criterion': '4.1.1'}],
        'unmappedCriteria': [], 'criteriaWithoutCriterionSummary': [],
        'taskLevelMismatches': [], 'roleNormalizations': [], 'warnings': [],
        'unknownARRMCriteria': [], 'sourceSHA256': hashes,
    }
    return data, audit


class SmokeValidationTests(unittest.TestCase):
    def setUp(self):
        self.data, self.audit = valid_payload()
        self.minimums = {'criteria': 1, 'tasks': 1, 'roles': 1}

    def errors(self, data=None, audit=None):
        return validate_payload(data or self.data, audit or self.audit, self.minimums)

    def test_valid_payload_passes(self):
        self.assertEqual(self.errors(), [])

    def test_demo_mode_is_rejected(self):
        data = copy.deepcopy(self.data)
        data['mode'] = 'demo'
        self.assertTrue(any('expected' in error and 'production' in error for error in self.errors(data=data)))

    def test_live_4_1_1_is_rejected(self):
        data = copy.deepcopy(self.data)
        data['criteria'].append({
            'number': '4.1.1', 'name': 'Parsing', 'level': 'A',
            'normativeUrl': 'https://www.w3.org/TR/WCAG22/#parsing',
            'understandingUrl': 'https://www.w3.org/WAI/WCAG22/Understanding/parsing.html',
            'arrmResponsibilities': {}, 'inBrief': {}, 'mapped': True,
        })
        self.assertTrue(any('4.1.1' in error for error in self.errors(data=data)))

    def test_count_mismatch_is_rejected(self):
        audit = copy.deepcopy(self.audit)
        audit['counts']['acceptedTasks'] = 2
        self.assertTrue(any('acceptedTasks' in error for error in self.errors(audit=audit)))

    def test_audit_gap_lists_must_match_data(self):
        audit = copy.deepcopy(self.audit)
        audit['unmappedCriteria'] = ['2.1.1']
        self.assertTrue(any('unmappedCriteria' in error for error in self.errors(audit=audit)))
        audit = copy.deepcopy(self.audit)
        audit['criteriaWithoutCriterionSummary'] = ['1.1.1']
        self.assertTrue(any('criteriaWithoutCriterionSummary' in error for error in self.errors(audit=audit)))

    def test_duplicate_task_and_unknown_criterion_are_rejected(self):
        data = copy.deepcopy(self.data)
        data['tasks'].append(copy.deepcopy(data['tasks'][0]))
        self.assertTrue(any('duplicate task id' in error for error in self.errors(data=data)))
        data = copy.deepcopy(self.data)
        data['tasks'][0]['criterion'] = '9.9.9'
        self.assertTrue(any('unknown criterion' in error for error in self.errors(data=data)))

    def test_invalid_summary_status_is_rejected(self):
        data = copy.deepcopy(self.data)
        data['criteria'][0]['criterionSummaryStatus'] = 'unknown'
        self.assertTrue(any('criterionSummaryStatus' in error for error in self.errors(data=data)))

    def test_missing_source_hash_is_rejected(self):
        data = copy.deepcopy(self.data)
        data['sourceSHA256']['wcag'] = 'not-a-hash'
        self.assertTrue(any('SHA-256' in error for error in self.errors(data=data)))

    def test_role_shell_markers(self):
        shell = ('<!doctype html><html lang="en"><head>'
                 '<link rel="stylesheet" href="./styles.css"><script type="module" src="./role-page.js"></script></head>'
                 '<body><a href="#main">Skip to main content</a><main id="main">'
                 '<p id="role-status"></p><div id="role-root"></div></main></body></html>')
        self.assertEqual(validate_role_shell(shell), [])
        self.assertTrue(any('role-root' in error for error in validate_role_shell(shell.replace('id="role-root"', ''))))

    def test_index_markers_and_relative_assets(self):
        html = ('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width">'
                '<meta name="color-scheme" content="light dark">'
                '<link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script></head>'
                '<body><a href="#main">Skip to main content</a><h1>Important distinction</h1>'
                '<p>This tool is not an official W3C publication.</p>'
                '<a href="./data/role-data.json">data</a><a href="./data/import-audit.json">audit</a></body></html>')
        self.assertEqual(validate_index(html), [])
        broken = html.replace('src="./app.js"', 'src="/app.js"')
        self.assertTrue(any('root-absolute' in error for error in validate_index(broken)))
        external = html.replace('src="./app.js"', 'src="https://cdn.example/app.js"')
        self.assertTrue(any('non-relative' in error for error in validate_index(external)))


if __name__ == '__main__':
    unittest.main()
