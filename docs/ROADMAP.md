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

Still open for Phase 1:

- Pinned upstream commit SHAs and immutable source archives (the current audit records hashes, not pinned commits).
- Recorded manual screen-reader, real forced-colours, 200%/400% zoom and print evidence with reviewer, OS and AT versions.
- Deciding, with maintainers, whether the 3.2.7–3.2.9 and 3.3.7–3.3.9 findings should be filed upstream or already have issues.
- A second-person review of the audit and the task-level ownership presentation.

## Phase 2: More useful role views

- Add guided role landing pages: Visual Design, Front-End Development, UX Design and Content Authoring.
- Introduce categories aligned to ARRM task groupings rather than an invented new standard.
- Add cross-role handoff descriptions linked to primary task IDs.
- Add links to official W3C sufficient techniques, failures, and ACT rules where sources support them.
- Let users export a role/task list as JSON or CSV without suggesting the list alone is a conformance checklist.

Acceptance: a user can distinguish assigned work from overall conformance requirements and trace every task to W3C evidence.

## Phase 3: Optional and reviewed AI enrichment

- Evaluate Hugging Face inference only as a CI-side, opt-in drafting utility.
- Suggest plain-language explanations or contextual examples with citations; maintain a separate reviewed dataset.
- Enforce provenance, human approval, uncertainty labeling and no automated conformity conclusions.
- Keep published site functional if AI is disabled or unavailable.

Acceptance: all AI output is optional, attributed to source material, and human-reviewed before publication.
