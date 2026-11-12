# WCAG by Role

An independent, static, role-filtered view of WCAG 2.2 and W3C Accessibility Roles and Responsibilities Mapping (ARRM). Built for GitHub Pages using Python's standard library and browser-native HTML, CSS and JavaScript.

**This is a navigation and planning aid, not an alternative WCAG standard or a conformance assessment.** Filtering by role never changes the normative WCAG criteria.

## Features

- Filter by ARRM role, task-level **primary / secondary / contributor** ownership, exact WCAG level, keyword and view.
- Switch between success criterion and task views, with links to normative WCAG and informative Understanding pages.
- Show unchanged W3C Understanding *In Brief* excerpts when available, otherwise retain direct links. The W3C `Author task` label is kept when a page uses it instead of `What to do`.
- Preserve the difference between task-level assignments and ARRM's criterion-level responsibility summary.
- Include criteria with no recorded task, using the *Include criteria with no matching task* control.
- Deep-link to filters via URL parameters. No cookies, third-party browser assets, analytics or AI.
- Create a provenance/audit JSON showing obsolete or unmapped records, including obsolete WCAG 4.1.1 Parsing, unknown ARRM criterion numbers, missing criterion summaries, task-level level disagreements and explicitly normalized role labels.

## Quick start (no network)

Requirements: Python 3.11 or later. No package install or build toolchain needed.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/pipeline.py --mode demo
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000/ . **Demo data is deliberately incomplete**. The page identifies itself as a sample. Do not deploy it as the full reference.

Browser regression tests use Playwright and axe-core. They run against the demo build served from a nested `/dist/` path:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e
```

These tests are regression evidence, not a WCAG conformance claim. See [docs/ACCESSIBILITY-TEST-PLAN.md](docs/ACCESSIBILITY-TEST-PLAN.md) for the checks that still require people.

## Full production build

This downloads the current WCAG JSON, both ARRM CSVs and, unless skipped, short *In Brief* sections from W3C Understanding pages.

```sh
python3 scripts/pipeline.py --mode production
python3 -m http.server 8000 --directory dist
```

The production command fails if the upstream dataset is unavailable, too small, or missing a required CSV column. Source URLs, build timestamps, source-schema fingerprints and SHA-256 input hashes are recorded in output JSON. Retrieval of an individual Understanding page is best effort; the audit records missing or partial summaries, while the original W3C link remains. Use `--skip-understanding` for a faster build with the original links only.

The importer does not silently rewrite upstream material. Known ARRM role spelling variants are mapped through a small explicit alias manifest, and every mapping is listed under `roleNormalizations` in `import-audit.json`. Task wording and ownership flags are copied unchanged. Task-level `Level` disagreements with WCAG are reported under `taskLevelMismatches`; the UI uses the WCAG criterion level.

## Publish with GitHub Pages

1. Create a public GitHub repository and upload **the contents of this directory**, including `.github/workflows/pages.yml`.
2. Commit to the `main` branch.
3. In repository **Settings → Pages → Build and deployment**, set **Source = GitHub Actions**.
4. In **Actions**, run `Build and deploy WCAG by Role` with `workflow_dispatch` if it has not started automatically.
5. Check the Pages URL shown in the deployment job. Project pages under `/repository-name/` work because paths in the site are relative.

`dist/` is generated and ignored by Git. The workflow builds it in the runner and uploads only the production artefact. It runs unit and browser tests before a production import, so a failed import blocks deployment instead of publishing sample fixtures.

The workflow runs on pushes to `main`, pull requests, manual triggers and a weekly schedule. Pull requests run the offline unit and browser tests but do not fetch live sources or deploy. The production import runs on `main`, manual triggers and the weekly schedule. Production fetch failures block deployment; the Actions workflow never uploads the sample data as a successful production build.

## Repository layout

```text
.github/workflows/pages.yml   Test, build, deploy, weekly refresh
web/                          Site HTML, CSS, JavaScript
scripts/pipeline.py           Fetch, parse, normalize, audit, build
fixtures/                     Clearly labeled offline demonstration data
tests/test_pipeline.py        Python import and business-rule tests
tests/e2e/                    Playwright and axe-core browser tests
package.json, pnpm-lock.yaml  Browser-test dependencies
docs/                         Governance, architecture, audit, roadmap, test plan
NOTICE.md                     W3C attribution and reuse cautions
AGENTS.md                     Agent instructions for contributors
```

Generated `dist/data/role-data.json` and `dist/data/import-audit.json` are available on the deployed site and suitable for other tools. `dist/` is ignored in Git and generated for every deployment.

## Authoritative sources

- WCAG Recommendation: https://www.w3.org/TR/WCAG22/
- WCAG structured data: https://www.w3.org/WAI/WCAG22/wcag.json
- Understanding: https://www.w3.org/WAI/WCAG22/Understanding/
- ARRM tasks: https://www.w3.org/WAI/planning/arrm/tasks/
- ARRM task CSV: https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-all-tasks.csv
- ARRM criterion roles CSV: https://raw.githubusercontent.com/w3c/wai-arrm/main/_data/arrm/arrm-wcag-sc.csv

See [NOTICE.md](NOTICE.md) for copyright and attribution. ARRM mappings are advisory and incomplete; missing entries are not failures or exemptions.

## Scope and limitations

The source WCAG JSON contains an obsolete 4.1.1 Parsing record. This importer omits it because it lacks WCAG 2.2 in `versions` and a current conformance level. The audit retains the record and related obsolete ARRM tasks. A role can have primary responsibility for one task and secondary responsibility for another task linked to the same success criterion. Accordingly, **role ownership is assigned at task level** and never inferred solely from the criterion summary.

The browser uses W3C criterion names and links, plus task wording from ARRM. It does not claim that a task or an Understanding statement is normative. Documentation does not promise a WCAG conformance level or label this prototype as certified accessible. Manual review by disabled users and assistive technology users remains necessary.

The production audit for the 2026-11-12 source snapshot is in [docs/AUDIT.md](docs/AUDIT.md). It records the counts, the 4.1.1 Parsing exclusion, the 3.2.7–3.2.9 unknown ARRM rows, the 3.3.7–3.3.9 missing criterion summaries, five task-level level disagreements and five normalized role labels. No missing data is filled in.

## Contribution policy

Prefer fixes upstream when the source W3C data is wrong. Do not silently edit a published W3C task or criterion in a local copy. File a GitHub issue with source URL, affected task IDs and proposed evidence; see [docs/GOVERNANCE.md](docs/GOVERNANCE.md).

The Phase 1 change set and its review checklist are summarized in [docs/PHASE1-PR.md](docs/PHASE1-PR.md).
