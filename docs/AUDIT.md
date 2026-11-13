# Source and build audit — 2026-11-12

This audit records what was imported at a point in time. It is not a WCAG conformance claim and it does not replace reviewing the W3C sources.

## Commands

```sh
python3 -m unittest discover -s tests -v
python3 scripts/pipeline.py --mode demo
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e
python3 scripts/pipeline.py --mode production   # network; may be rate-limited
```

## Offline demo build

| Measure | Value |
| --- | --- |
| Active criteria | 10 (deliberately partial sample) |
| Accepted ARRM tasks | 12 |
| Canonical roles | 4 |
| Retired criteria retained in audit | 1 (4.1.1 Parsing) |
| Excluded ARRM records | 2 (task and criterion summary for 4.1.1) |
| Criteria with a task | 7 |
| Criteria with a criterion-level summary | 7 |
| Understanding *In Brief* records | 2 (includes one `Author task` sample) |
| Python tests | 32 passed |
| Playwright / axe-core tests | 43 passed |

The demo page shows a visible sample-data warning. `dist/` is generated and is not committed.

## Live production import

Sources fetched on 2026-11-12:

| Source | URL | SHA-256 |
| --- | --- | --- |
| WCAG 2.2 JSON | https://www.w3.org/WAI/WCAG22/wcag.json | `b6bedebc86e96c4989722dd7ebb49eb604f8b832de04f7a570430c5ebee097e6` |
| ARRM tasks CSV | https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv | `18fda63a93ca1b448a5ba153ae14d920005dda44c96224d96c80d8e6f879c5a7` |
| ARRM criterion roles CSV | https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv | `b45e131a3bb2e4ef883a75624ede53c62f3e7e7f716ad332226eabfdcfcdcbc1` |

WCAG JSON `Last-Modified`: `Fri, 06 Nov 2026 08:56:14 GMT`.

| Measure | Value |
| --- | --- |
| Raw WCAG success criteria | 87 |
| Active WCAG 2.2 criteria | 86 (A 31, AA 24, AAA 31) |
| Retired criterion | 4.1.1 Parsing (versions 2.0, 2.1; no level) |
| Raw ARRM task rows | 266 |
| Accepted ARRM tasks | 262 |
| Rows for retired 4.1.1 | 4 tasks, 1 criterion summary — excluded from live views |
| Canonical roles | 5: Business Analysis, Content Authoring, Visual Design, User Experience (UX) Design, Front-End Development |
| Criteria with at least one task | 86 of 86 |
| Criteria with a criterion-level summary | 83 of 86 |
| Understanding *In Brief* parsed | 86 of 86 |
| Partial *In Brief* records | 0 |
| Task rows with a level different from WCAG | 5 |
| Non-canonical role labels normalized | 5 |

### Retirement and unknown criteria

- **4.1.1 Parsing** is present in the WCAG JSON with versions 2.0 and 2.1 and no current conformance level. It is not in `criteria` and not in `tasks`; the audit keeps it under `retiredWCAG` and `excludedARRM`. The UI must never render it as a live WCAG 2.2 requirement.
- **3.2.7, 3.2.8, 3.2.9** appear in the ARRM criterion-responsibility CSV but do not exist in the WCAG 2.2 JSON. They are excluded and reported as `unknownARRMCriteria`, not invented as new criteria.
- **3.3.7, 3.3.8, 3.3.9** have tasks but no criterion-level summary (`criterionSummaryStatus: "missing"`). [w3c/wai-arrm#141](https://github.com/w3c/wai-arrm/issues/141) proposes that the 3.2.7–3.2.9 rows above are these criteria misnumbered. The issue was open on 2026-11-12. This project does not renumber the CSV locally and does not infer the role assignments.

### Mapping gaps

- **3.3.7 Redundant Entry, 3.3.8 Accessible Authentication (Minimum), 3.3.9 Accessible Authentication (Enhanced)** have tasks but no criterion-level summary in the ARRM CSV. The UI keeps the criteria visible and shows no criterion summary for the affected role; it does not infer one. See the #141 note under "Retirement and unknown criteria".
- No active criterion lacks an ARRM task in this snapshot. That is a property of this snapshot, not a guarantee.

### Upstream data-quality warnings (preserved, not silently corrected)

Task level disagreements with WCAG (the UI uses the WCAG level):

| Task | Criterion | Task CSV level | WCAG level |
| --- | --- | --- | --- |
| FRM-021 | 3.2.4 | A | AA |
| FRM-022 | 3.2.4 | A | AA |
| FRM-034 | 3.3.2 | AA | A |
| NAV-032 | 3.2.6 | AAA | A |
| DYN-002 | 2.4.12 | AA | AAA |

Role labels normalized through the explicit alias manifest:

| Raw value | Canonical | Where |
| --- | --- | --- |
| Business | Business Analysis | Criterion summary column, 4 rows |
| Design Visual Design | Visual Design | Task NAV-013 |
| Front End Development | Front-End Development | Tasks CSS-013, IMG-014, INP-026 |
| Front-End Developement | Front-End Development | Task ANM-035 |
| User Experience (UX) | User Experience (UX) Design | Task NAV-013 |

These are source-label inconsistencies. The original task text and ARRM ownership flags are unchanged; every rewrite is listed in `roleNormalizations` in the import audit. Proposed upstream corrections should cite the task IDs or criterion rows above.

### Schema review

- WCAG success-criterion keys observed: `alt_id`, `content`, `details`, `handle`, `id`, `level`, `num`, `techniques`, `title`, `versions`. The importer continues to require `num`, `id`, `handle`, `versions` and `level`.
- ARRM task CSV headers observed: `ID`, `WCAG SC`, `Level`, `Task`, `Main Role`, `Starter List`, `Primary Ownership`, `Secondary Ownership`, `Contributor`.
- ARRM criterion CSV headers observed: `ID`, `WCAG SC`, `Level`, `Business`, `Content Authoring`, `Visual Design`, `User Experience (UX) Design`, `Front-End Development`.
- Missing headers now fail the build with the source name in the error. Extra headers are recorded in `sourceSchema`; the capability summary CSV is treated as a set of role columns.

### Understanding *In Brief* extraction

- 84 pages use `Goal`, `What to do`, `Why it's important`.
- 2 pages (1.4.12 Text Spacing, 2.2.6 Timeouts) use `Goal`, `Author task`, `Why it's important`. The importer stores the unchanged text under `authorTask` so the original label is not replaced.
- The parser accepts any heading level for the `In Brief` heading, nested emphasis and links inside `dd`, curly apostrophes in labels, and an unexpected label is ignored rather than mapped. If a section is missing or partial, the official Understanding link remains and the audit records a warning.

### Links

- 86 normative URLs use 86 distinct `#fragment` targets. All 86 fragments exist in the current WCAG 2.2 Recommendation page (1,276 `id` values checked).
- 86 Understanding URLs were fetched with HTTP 200. No broken Understanding links were found.
- Internal references in the built HTML (`./app.js`, `./styles.css`, `./favicon.svg`, `./data/role-data.json`, `./data/import-audit.json`) all resolve in `dist/`.
- External plain-language patterns resolved for all 86 active criteria on 2026-11-13: `https://simplewcag.org/criteria/{number-with-dashes}-{slug}/` and `https://aaardvarkaccessibility.com/wcag-plain-english/{number-with-dashes}-{slug}/` each returned HTTP 200 with no redirects. Link-only policy and licensing are in [EXTERNAL-RESOURCES.md](EXTERNAL-RESOURCES.md).
- Repeated automated requests from the audit machine triggered W3C Cloudflare HTTP 429. The importer retries with backoff and fails closed rather than deploying partial data. The link and extraction evidence above was collected from live curl responses; a later unauthenticated Python `urllib` request was challenged. Treat this as a local rate-limit limitation, not proof that CI will always be allowed through.

## Automated accessibility evidence

Playwright 1.65 with axe-core 4.14 runs against the demo build served under `/dist/` (a nested path):

- axe-core WCAG A/AA tags in light and dark schemes: no violations.
- axe-core in task view with a role filter: no violations.
- Keyboard: skip link focus, tab to filters, native select typeahead, focus retained after filtering.
- Forced colours: focus outline and component borders remain present under emulated `forced-colors: active`.
- 320 CSS-pixel reflow: no horizontal page scrolling.
- Reduced motion: preference matches and the interface remains usable.
- Result count: polite live region is present and updates.
- A manual production-data smoke run served the 86-criterion dataset from a nested path: 86 of 86 criteria and 262 tasks rendered, no console errors, no live 4.1.1 link, and axe-core returned no WCAG A/AA violations in the default and Visual Design primary task views.
- Role-guide tests cover both guides, task-level ownership, collaborating roles, category/task/criterion anchors, invalid-role chooser, keyboard reach, 320 px reflow, forced colours and axe-core in light and dark schemes. The production snapshot renders 66 Visual Design tasks across 33 criteria and 130 Front-End Development tasks across 45 criteria.
- Resource-link tests verify both plain-language URLs, external/commercial labels, `rel="external"`, no new-tab target, the general resource groups and axe-core with disclosures open.
- A pure filter matrix covers 256 combinations of role, ownership, cumulative conformance target and exact level. Explorer tests cover missing-summary, summary-does-not-assign-role and no-task-for-role messages. A production snapshot rendered 172 per-criterion resource links across 86 criteria, all matching the validated URL patterns.
- Visual-language tests cover original decorative SVG icons, role/category icon counts, the eight functional-needs groups, no external images, dark/forced-colour visibility, 320 px reflow and axe with the visual sections.

**This is regression evidence, not a conformance claim.** axe-core cannot judge meaningful link text, sensible focus order, screen-reader announcements, real high-contrast rendering, zoom quality or whether the ARRM mapping is appropriate for a team.

## Manual checks still required

Record these with [MANUAL-TEST-TEMPLATE.md](MANUAL-TEST-TEMPLATE.md). Ready-to-file upstream corrections are in [UPSTREAM-ARRM-FINDINGS.md](UPSTREAM-ARRM-FINDINGS.md).

1. VoiceOver + Safari and NVDA + Firefox: filter changes, result count announcements, task/criterion reading order, disclosure state.
2. Real Windows High Contrast / forced-colors mode: focus visibility on every control, badges, borders and the skip link.
3. Browser zoom 200% and 400%, plus 320 CSS px: no clipped content, no two-dimensional scrolling for ordinary content.
4. Light and dark mode contrast with a colour-contrast checker, including hover and focus states.
5. Keyboard-only pass through the entire page in at least two browsers, including reset, search, role/ownership/level/view controls and every source link.
6. Print preview: filters hidden, criterion cards not split awkwardly, link URLs usable.
7. Content review with Visual Design, Front-End Development and UX practitioners: confirm that task-level primary/secondary/contributor distinctions match how they plan work, especially for criteria with tasks owned by different roles.
8. Data review by a WCAG/ARRM expert: confirm the 3.3.7–3.3.9 summary gap, 3.2.7–3.2.9 unknown rows, level mismatches and role-label variants should be raised upstream.
9. Screen-reader reading of the Understanding *In Brief* disclosure and the "no matching task" message.
10. Final review of this audit by a second person before describing the site as production-ready.
