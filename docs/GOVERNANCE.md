# Governance and content integrity

This is an independent open-source navigation tool. W3C retains authority over WCAG text and ARRM material. Local contributors maintain the importer, UI, metadata and explanatory project documentation.

## Sources of truth

- WCAG 2.2 normative text and statuses: https://www.w3.org/TR/WCAG22/
- W3C Understanding: informative (not normative)
- ARRM tasks CSV: roles and task assignments, descriptive and incomplete
- ARRM responsibilities CSV: criterion-level role summary, not a replacement for tasks

Do not relabel advisory task text as a criterion requirement. Do not claim every criterion or ARRM task applies to every project. Never represent filtered results as exhaustive WCAG conformance proof.

## Source corrections

For a suspected W3C data error, open an issue with the current source URL, exact record identifier, expected behavior, and why it matters. Propose the correction upstream first. Local exceptions require an explicit manifest and independent review; no unlogged overrides in `pipeline.py`.

### Role-label normalization

ARRM publishes a few role spellings differently between the task CSV and the criterion-summary CSV. The importer has a small, explicit alias manifest (`Business`, `Front End Development`, `Front-End Developement`, `User Experience (UX)`, `Design Visual Design`). This is identifier cleanup, not a re-assignment of responsibility:

- Task wording and the primary/secondary/contributor flags are copied unchanged.
- Every substitution is listed with its raw value, task IDs or criterion numbers in `roleNormalizations` in the import audit.
- Unknown role labels are preserved and remain visible; they are not fuzzy-matched.
- A new alias needs a test, a source example and an upstream correction issue. Do not add broad or case-insensitive guessing.

### Reported but not corrected upstream anomalies

The 2026-11-12 audit found task-level `Level` disagreements (FRM-021, FRM-022, FRM-034, NAV-032, DYN-002), three ARRM criterion rows with no WCAG 2.2 counterpart (3.2.7, 3.2.8, 3.2.9), and three active criteria with no criterion-level summary (3.3.7, 3.3.8, 3.3.9). These are recorded in the audit for upstream follow-up. The project does not invent missing summaries or silently change ARRM levels.

## Contributions and review

- One conceptual change per pull request.
- Include a test for every change to import semantics, role ownership mapping or retirement handling.
- Keep all source attribution visible. Review copyright permissions before adding any copied material.
- Run automated tests and manual keyboard / assistive technology checks before describing the UI as accessible.
- Preserve simplicity: GitHub Pages should remain a supported deploy target without a server or paid API.

## Decision log

Document new architectural decisions under `docs/` with the rationale, alternatives considered and accepted tradeoffs. In particular, any proposal to add an AI model must satisfy [AI-POLICY.md](AI-POLICY.md).
