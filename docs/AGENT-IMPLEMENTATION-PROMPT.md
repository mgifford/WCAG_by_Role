# Prompt for a coding agent

You are maintaining the `WCAG by Role` open-source repository. Begin by reading `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/GOVERNANCE.md`, `docs/ROADMAP.md`, `docs/ACCESSIBILITY-TEST-PLAN.md` and `NOTICE.md`.

Goals:

1. Run the complete offline demo build and all tests. Confirm that all filters work and that the site can be served from a nested GitHub Pages path.
2. Inspect the latest W3C WCAG 2.2 JSON, ARRM task CSV and criterion responsibility CSV. Run a live production build and audit the results. Report counts, mapping gaps, retirement exclusions and any schema changes. Do not invent missing data.
3. Check Understanding *In Brief* extraction against real upstream HTML. Test parsing for different document layouts. If sections cannot reliably be extracted, leave official links, log warnings and do not fabricate summaries.
4. Review the design and interaction for visual designers and front-end developers. Ensure task-level primary, secondary and contributor responsibilities remain distinct. The same criterion can involve different tasks owned by different roles.
5. Add Playwright and axe-core CI tests with keyboard and forced-colors checks. Identify what remains manual testing; do not mistake automated passes for a conformance claim.
6. Suggest the smallest sensible PR for Phase 1 improvements and implement it. Prefer maintainable stdlib Python and dependency-light JavaScript, without a backend.

Constraints:

- Preserve normative W3C text and ARRM assignments. Do not alter original wording or remove source attribution.
- Keep no-AI as the default. Optional HF/AI must never make conformance claims or become required for site operation.
- Do not publish sample fixtures as the complete dataset.
- Do not let an obsolete 4.1.1 Parsing entry appear as a live WCAG 2.2 requirement.
- Keep production deployment on GitHub Pages via Actions, with data provenance and a clear build failure for incomplete upstream imports.

Deliverables:

- A short source-and-build audit (counts, warnings, broken links, unexpected mapping gaps).
- Tested code changes in a coherent, reviewable PR.
- Updated tests and docs.
- A list of manual accessibility checks still required, without implying that automated validation establishes conformance.
