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

## Contributions and review

- One conceptual change per pull request.
- Include a test for every change to import semantics, role ownership mapping or retirement handling.
- Keep all source attribution visible. Review copyright permissions before adding any copied material.
- Run automated tests and manual keyboard / assistive technology checks before describing the UI as accessible.
- Preserve simplicity: GitHub Pages should remain a supported deploy target without a server or paid API.

## Decision log

Document new architectural decisions under `docs/` with the rationale, alternatives considered and accepted tradeoffs. In particular, any proposal to add an AI model must satisfy [AI-POLICY.md](AI-POLICY.md).
