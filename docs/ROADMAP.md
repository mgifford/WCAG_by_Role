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
