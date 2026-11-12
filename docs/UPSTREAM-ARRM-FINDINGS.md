# Upstream ARRM findings — ready-to-file issue drafts

These are drafts for the [w3c/wai-arrm issue tracker](https://github.com/w3c/wai-arrm/issues/new). They are not filed by this project. Do not edit the published CSVs locally in place of an upstream correction.

Evidence snapshot: 2026-11-12. CSVs and WCAG JSON hashes are recorded in [AUDIT.md](AUDIT.md).

---

## 1. Criterion-level responsibility rows are missing for 3.3.7, 3.3.8 and 3.3.9

**Source:** https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv

**Observed:** The CSV jumps from ID 84 (`3.3.6`, AAA) to ID 85 (`4.1.1`, A). There are no rows for `3.3.7`, `3.3.8` or `3.3.9`, although these are active WCAG 2.2 success criteria and the task CSV contains tasks for them.

**Expected:** One criterion-level responsibility row for each active WCAG 2.2 criterion, with the reviewed role assignments, or an explicit note that the rows are intentionally pending.

**Why it matters:** A role-filtered view can show tasks for these criteria but has no criterion-level summary. The site reports the gap and leaves the summary blank; it does not infer assignments. Consumers joining on `WCAG SC` lose the summary for three criteria.

**Evidence:** WCAG JSON has `3.3.7 Redundant Entry` (A), `3.3.8 Accessible Authentication (Minimum)` (AA) and `3.3.9 Accessible Authentication (Enhanced)` (AAA). The task CSV has matching task rows. The responsibility CSV has no matching `WCAG SC` values.

**Proposed change:** Add the three rows after ARRM review, or add a documented placeholder/pending status if the assignments are not ready.

---

## 2. Rows for 3.2.7, 3.2.8 and 3.2.9 do not map to WCAG 2.2

**Source:** https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv

**Observed:** IDs 76, 77 and 78 use `WCAG SC` values `3.2.7` (A), `3.2.8` (AA) and `3.2.9` (AAA). These identifiers do not exist in the current WCAG 2.2 JSON.

**Expected:** Either these are future/draft criteria and should be clearly marked as such, or they are stale rows and should be removed from the current-data CSV.

**Why it matters:** Consumers that join on criterion number must exclude them. The site records them under `unknownARRMCriteria` and keeps them out of live views. Leaving them unmarked makes the CSV ambiguous for anyone building a WCAG 2.2 view.

**Proposed change:** Confirm the intended status and either remove the rows from the current-data file or split them into a clearly versioned draft file.

---

## 3. Task-level `Level` values disagree with the WCAG criterion level

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

## 4. Role labels use several spellings, and the responsibility CSV uses a different business label

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

- [ ] Open one issue per finding; cite the exact CSV URL and row/task IDs above.
- [ ] Include the WCAG 2.2 JSON URL and a short reproduction.
- [ ] Do not include local-only datasets, screenshots of private projects or personal data.
- [ ] Link the issues back to the project audit so local normalization can be removed when upstream is fixed.
