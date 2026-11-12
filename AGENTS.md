# Guidance for coding agents

## Purpose

Maintain an independent role-filtered navigation tool for WCAG 2.2. The authoritative requirements are W3C WCAG success criteria, not role-filtered summaries or ARRM task descriptions.

## Non-negotiable constraints

1. Never silently rewrite W3C normative content or ARRM task wording. Prefer upstream source fixes and cite exact URLs and task IDs in a proposed change.
2. Respect task-level primary, secondary, contributor assignments. Do not infer exclusive ownership from a success criterion summary.
3. Never suppress the existence of an active WCAG requirement simply because no task maps to it. The **all criteria** view must remain available.
4. Keep W3C status and attribution explicit. The project is not W3C-endorsed. Understanding is informative.
5. Do not use AI to infer compliance, diagnose issues, assign normative responsibility, or silently change source content.
6. Preserve offline demo and production separation. Production builds must fail on missing/incomplete upstream data, not deploy fixtures.
7. Do not add analytics, trackers, network-dependent browser scripts, or model downloads without an explicit documented decision.
8. Support keyboard use, screen readers, reflow, forced-colors mode, dark mode and reduced motion; test manually where tools cannot establish usability.

## Development checks

```sh
python3 -m unittest discover -s tests -v
python3 scripts/pipeline.py --mode demo
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e
python3 scripts/smoke_site.py --url https://mgifford.github.io/WCAG_by_Role/  # post-deploy only
python3 -m http.server 8000 --directory dist
```

Production integration requires network: `python3 scripts/pipeline.py --mode production`. Automated browser tests are regression evidence, not a conformance claim.

## Edit boundaries

- `web/` : UI only, no external frameworks needed for v1.
- `scripts/pipeline.py` : source retrieval, transformation and audit; Python stdlib only.
- `fixtures/` : representative mock records, *never* complete WCAG or ARRM.
- `tests/` : import normalization and business-rule regression tests.
- `tests/e2e/` : Playwright and axe-core browser regressions for filtering, keyboard, reflow and forced colours.
- `docs/` : governance, architecture, road map and AI policy.

## Quality bar

When changing data shape, update browser code, fixtures, tests, schemaVersion and docs. For source changes, review the published ARRM CSV headers and WCAG JSON schema and create a specific regression test. Role spelling normalization must go through the explicit `ROLE_ALIASES` manifest and be reported in `roleNormalizations`; never fuzzy-match an ARRM assignment. Do not claim browser or assistive technology testing unless you performed it. If live external verification is unavailable, document that limitation.
