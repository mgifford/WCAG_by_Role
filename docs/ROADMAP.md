# Roadmap

## Phase 0: Runnable baseline (included)

- GitHub Pages deploy with GitHub Actions, weekly update and PR tests.
- WCAG 2.2 JSON and ARRM task-level CSV import.
- Role, primary/secondary/contributor, level and search filters.
- Browser-native UI with query-string sharing and task or criterion views.
- Obsolete criteria audit and source attribution.
- Optional live Understanding *In Brief* import with source links and fallback.

Acceptance: GitHub Pages deploy produces a production dataset, never a demo dataset; users can browse all criteria and separately filter by role.

## Phase 1: Trustworthy production quality

- Review all 86 active success criteria and the full task mapping in a live deployment.
- Run axe-core and browser automation (Playwright) on both role views, keyboard and screen reader manual verification, forced-colors and zoom testing.
- Verify Understanding extraction against real W3C markup and handle its structure changes.
- Measure source drift with pinned SHA-256 source manifests and warnings on changed row counts or task IDs.
- Inspect ARRM mapping gaps and record proposed upstream corrections without overwriting source material.

Acceptance: documented, repeatable test evidence; accessible filter controls and source links; clear data freshness metadata.

### Status on 2026-11-12

Done in the Phase 1 change set ([PHASE1-PR.md](PHASE1-PR.md)):

- Live review of 86 active criteria and 262 ARRM tasks; source gaps and retirement exclusions recorded in [AUDIT.md](AUDIT.md).
- Playwright + axe-core coverage for the demo build, both views, keyboard use, forced colours, reflow, reduced motion and dark scheme. These are regression tests only.
- Understanding extraction checked against all 86 live pages, including the `Author task` label variant on 1.4.12 and 2.2.6.
- Source schema fingerprints, SHA-256 input hashes, header validation and fail-closed production gates.
- ARRM mapping gaps, unknown criteria, task-level level disagreements and explicit role-label normalisations surfaced in the audit.
- GitHub Actions updated to current Node 24 runtimes, with a post-deploy smoke test of the live production artefact.
- A manual-test record template and ready-to-file upstream ARRM issue drafts.

Still open for Phase 1:

- Pinned upstream commit SHAs and immutable source archives (the current audit records hashes, not pinned commits).
- Completed manual screen-reader, real forced-colours, 200%/400% zoom and print evidence with reviewer, OS and AT versions in [MANUAL-TEST-TEMPLATE.md](MANUAL-TEST-TEMPLATE.md).
- Filing and following up the upstream ARRM findings in [UPSTREAM-ARRM-FINDINGS.md](UPSTREAM-ARRM-FINDINGS.md).
- A second-person review of the audit and the task-level ownership presentation.

## Phase 2: More useful role views

- Add guided role landing pages for every role with ARRM task data: Business Analysis, Content Authoring, User Experience (UX) Design, Visual Design and Front-End Development.
- Introduce categories aligned to ARRM task groupings rather than an invented new standard.
- Add cross-role handoff descriptions linked to primary task IDs.
- Add links to official W3C sufficient techniques, failures, and ACT rules where sources support them.
- Let users export a role/task list as JSON or CSV without suggesting the list alone is a conformance checklist.

### Status

PR 1 (role-specific navigation) and the remaining role guides implement:

- Business Analysis, Content Authoring, User Experience (UX) Design, Visual Design and Front-End Development guides with distinct, data-driven category lists.
- Shared role cards, DOM helpers and one role template; adding a role is a config entry.
- Task-level primary/secondary/contributor assignments with collaborating roles kept visible.
- Direct anchors for categories, tasks and WCAG criteria, plus links to WCAG and Understanding.
- Project handoff guidance explicitly separated from ARRM assignments.
- Link-only external resources: Simple WCAG and AAArdvark per-criterion explanations, plus testing, standards-mapping and impact references. No third-party text or impact dataset is imported.
- Original inline SVG icons for ARRM categories and role cards, plus a **Who accessibility affects** functional-needs overview aligned with Section 508 FPC and EN 301 549 references.
- Supplied WCAG 2.2 pictogram sprite (86 success criteria, 13 guidelines) shown with each criterion; no 4.1.1 entry and no per-criterion impact mapping imported.

Current PR 2 work:

- Clearer missing-summary distinctions.
- A separate cumulative A/AA/AAA conformance-target control alongside exact-level filtering.
- Pure filter logic with a role/ownership/target/exact matrix test.

Still to come in Phase 2:

- PR 3: CSV/JSON export, source revision provenance and production-data regression fixtures.
- PR 4: refinements based on manual accessibility and role-based usability evidence.
- A reviewed per-criterion impact layer after a data-specific licence decision for the accessibility-impact dataset.

Acceptance: a user can distinguish assigned work from overall conformance requirements and trace every task to W3C evidence.

### Source-data migration status (2026-11-13)

- Added the canonical `data/source/role-data.yaml` production snapshot with all 86 active criteria, 262 accepted tasks, five roles, task-level ownership and source SHA-256 hashes.
- Added `schemas/role-data.schema.yaml`, stdlib source validation and a YAML round-trip/parity test.
- Production builds now write, validate and read back the YAML before regenerating the browser JSON. PyYAML is build/test-only.
- The snapshot is deliberately separate from editorial role profiles and interpretations; those remain a later, reviewed layer.

## Phase 3: Optional and reviewed AI enrichment

- Evaluate Hugging Face inference only as a CI-side, opt-in drafting utility.
- Suggest plain-language explanations or contextual examples with citations; maintain a separate reviewed dataset.
- Enforce provenance, human approval, uncertainty labeling and no automated conformity conclusions.
- Keep published site functional if AI is disabled or unavailable.

Acceptance: all AI output is optional, attributed to source material, and human-reviewed before publication.
