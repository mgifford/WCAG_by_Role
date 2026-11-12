# Upstream ARRM findings and issue drafts

This file records one tracked W3C issue and drafts for the remaining findings. The drafts are for the [w3c/wai-arrm issue tracker](https://github.com/w3c/wai-arrm/issues/new) and are not filed by this project. Do not edit the published CSVs locally in place of an upstream correction.

Evidence snapshot: 2026-11-12. CSVs and WCAG JSON hashes are recorded in [AUDIT.md](AUDIT.md). The related W3C project threads were checked on 2026-11-12.

## Related W3C ARRM work

| Thread | Status | How this project relates |
| --- | --- | --- |
| [Task-based Documentation (#135)](https://github.com/w3c/wai-arrm/issues/135) | Open | The project consumes ARRM tasks; role guides are presentation and navigation, not a parallel task documentation model. |
| [Expanding Role-specific Pages (#138)](https://github.com/w3c/wai-arrm/issues/138) | Open | Role guides are a small, evidence-based example of consuming ARRM role data. They do not claim to replace W3C role pages. |
| [3.3.7–3.3.9 numbering (#141)](https://github.com/w3c/wai-arrm/issues/141) | Open | This is the existing issue for the apparent 3.2.7–3.2.9 misnumbering. Do not open a duplicate. |

The project should remain a demonstration of useful ARRM consumption. Any proposal for a new responsibility model belongs in the W3C discussion first.

---

## 1. Tracked upstream: 3.3.7–3.3.9 are missing and 3.2.7–3.2.9 appear instead

**Do not file a new issue.** Track [w3c/wai-arrm#141](https://github.com/w3c/wai-arrm/issues/141).

**Sources:**

- Responsibility CSV: https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv
- Task CSV: https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv
- WCAG 2.2 JSON: https://www.w3.org/WAI/WCAG22/wcag.json

**Observed:**

- The responsibility CSV has IDs 76, 77 and 78 using `WCAG SC` values `3.2.7` (A), `3.2.8` (AA) and `3.2.9` (AAA). These identifiers do not exist in the current WCAG 2.2 JSON.
- The responsibility CSV has no rows for `3.3.7` (A), `3.3.8` (AA) or `3.3.9` (AAA), although the task CSV contains tasks for them.
- Issue #141 proposes that the three rows are the new WCAG 2.2 criteria misnumbered under 3.2. The issue author explicitly did not review the role assignments.

**Expected:** The rows are renamed and moved under Guideline 3.3 with reviewed role assignments, or the ambiguity is documented.

**Why it matters:** Consumers lose the criterion-level summary for three active criteria and must exclude three unknown identifiers. The project records both symptoms, does not renumber the data locally, and does not infer the role assignments.

**Local evidence:** `unknownARRMCriteria: ["3.2.7", "3.2.8", "3.2.9"]` and `criteriaWithoutCriterionSummary: ["3.3.7", "3.3.8", "3.3.9"]` in the import audit.

**Proposed follow-up:** Comment on #141 only with new evidence, or open a PR when the ARRM maintainers invite one. Re-check the issue before changing project documentation.

---

## 2. Task-level `Level` values disagree with the WCAG criterion level

**Source:** https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv

**Observed:**

| Task ID | WCAG SC | Task CSV `Level` | WCAG 2.2 level |
| --- | --- | --- | --- |
| FRM-021 | 3.2.4 | A | AA |
| FRM-022 | 3.2.4 | A | AA |
| FRM-034 | 3.3.2 | AA | A |
| NAV-032 | 3.2.6 | AAA | A |
| DYN-002 | 2.4.12 | AA | AAA |

**Expected:** The `Level` column should either match the criterion's WCAG level or be documented as a different concept (for example, task applicability rather than criterion conformance level).

**Why it matters:** A consumer may filter tasks by `Level` and show the wrong WCAG level. The site uses the WCAG criterion level and reports these rows under `taskLevelMismatches`, but the source remains ambiguous.

**Proposed change:** Correct the values, or rename/document the column so its meaning is unambiguous.

---

## 3. Role labels use several spellings, and the responsibility CSV uses a different business label

**Sources:**

- https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv
- https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv

**Observed role values in the task CSV:**

| Raw value | Tasks |
| --- | --- |
| `Front End Development` | CSS-013, IMG-014, INP-026 |
| `Front-End Developement` | ANM-035 |
| `User Experience (UX)` | NAV-013 |
| `Design Visual Design` | NAV-013 |

**Observed column label in the responsibility CSV:** `Business`. The task CSV uses `Business Analysis` (for example, IMG-016). The ARRM roles page describes the role group as Business and the role as Business Analysis.

**Expected:** Role identifiers should be consistent across both CSVs and match the published ARRM role names.

**Why it matters:** Role filters split into apparently different roles (`Front End Development` versus `Front-End Development`, for example). The site normalizes the five known variants through an explicit alias manifest and records every rewrite, but other consumers may not.

**Proposed change:** Correct the upstream labels and the responsibility CSV header, or publish a documented alias list if the variants are intentional.

---

## Filing checklist

- [ ] Check #141 first; do not file a duplicate for the 3.2.7–3.2.9 / 3.3.7–3.3.9 numbering.
- [ ] Open one issue per remaining finding; cite the exact CSV URL and row/task IDs above.
- [ ] Include the WCAG 2.2 JSON URL and a short reproduction.
- [ ] Do not include local-only datasets, screenshots of private projects or personal data.
- [ ] Link the issues back to the project audit so local normalization can be removed when upstream is fixed.
