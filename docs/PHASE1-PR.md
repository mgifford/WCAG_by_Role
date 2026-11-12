# Phase 1 pull request

**Title:** Phase 1: fail-closed production import, auditable role labels, and browser accessibility tests

## Why this is the smallest sensible Phase 1 change

Phase 1 in [ROADMAP.md](ROADMAP.md) is about trustworthy production quality, not new product scope. The repository already had a working demo, but it could not satisfy that promise because:

- `dist/` was committed with sample fixtures, while the README said it was generated.
- No `.github/` workflow existed, so the documented GitHub Pages deployment did not exist.
- Production imports checked only coarse row counts. A changed CSV header failed with an unhelpful `KeyError`, and source gaps were not reported together.
- Role spelling variants in ARRM produced ten apparent roles instead of five, including `Front End Development`, `Front-End Developement` and `Design Visual Design`.
- The Understanding parser silently dropped the `Author task` field used by 1.4.12 and 2.2.6, and only recognised `h2`.
- There was no browser automation or axe-core evidence, and no forced-colours regression check.

## What changed

1. **Generated output is no longer source.** `dist/` is ignored and untracked. Actions builds it from live W3C/ARRM data.
2. **Production fails closed.** Required CSV columns, empty files and non-WCAG structures raise source-specific errors. The production size gate remains, and a missing criterion-summary source is now also fatal.
3. **The audit is more useful.** It records retired and unknown ARRM criteria, criteria without tasks, criteria without criterion summaries, task-level mismatches, role-label normalisations, unrecognised ownership symbols, partial Understanding records, source schema fingerprints and hashes.
4. **Role labels are canonicalised explicitly.** A five-entry alias manifest maps known ARRM spelling variants to the canonical ARRM roles. Original task wording is untouched and every rewrite is listed in `roleNormalizations`. This is not fuzzy matching and not an inferred responsibility.
5. **Understanding extraction is faithful.** Any heading level starts the section; `Author task` is displayed with its original label; partial records keep the official link and produce a warning; unknown labels are ignored rather than guessed.
6. **Task-level ownership stays distinct.** The criterion-level ARRM summary now says explicitly that it is not task ownership. The task list is labelled "Task-level ARRM assignments". A criterion can show a summary flag and still have no task for the selected role; that case is explained rather than hidden.
7. **Accessibility regression coverage.** Playwright and axe-core tests cover filters, task-view ownership, URL deep links, nested-path serving, keyboard operation, forced-colours focus/borders, 320 px reflow, reduced motion and live-region behaviour.
8. **GitHub Pages deployment exists.** The workflow runs unit tests and browser tests on pulls and pushes, runs the live production import on `main`, manual triggers and the weekly schedule, deploys only from `main`, refreshes weekly, and verifies the live artefact with `scripts/smoke_site.py` after deployment.
9. **Manual evidence and upstream drafts are prepared.** [MANUAL-TEST-TEMPLATE.md](MANUAL-TEST-TEMPLATE.md) records checks automation cannot establish; [UPSTREAM-ARRM-FINDINGS.md](UPSTREAM-ARRM-FINDINGS.md) contains ready-to-file ARRM corrections.
10. **Docs and tests updated.** See [AUDIT.md](AUDIT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [ACCESSIBILITY-TEST-PLAN.md](ACCESSIBILITY-TEST-PLAN.md) and the expanded unit tests.

## Deliberately out of scope

- Role landing pages, cross-role handoffs and CSV/JSON export (Phase 2).
- Any AI or Hugging Face integration. The site remains deterministic and works offline after static assets load.
- A conformance or certification claim. Automated tests are regression evidence only.
- Editing upstream W3C/ARRM wording. Data issues are reported for upstream correction.

## Review checklist

```sh
python3 -m unittest discover -s tests -v
python3 scripts/pipeline.py --mode demo
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e
python3 scripts/smoke_site.py --url https://mgifford.github.io/WCAG_by_Role/
# Optional live import when W3C is not rate-limiting:
python3 scripts/pipeline.py --mode production
```

Then confirm:

- [ ] Demo warning is visible and the dataset is clearly partial.
- [ ] 4.1.1 Parsing never appears as a live criterion.
- [ ] A role filter shows task-level primary/secondary/contributor badges and a separately labelled criterion-level summary.
- [ ] `dist/data/import-audit.json` lists the 3.3.7–3.3.9 summary gap, 3.2.7–3.2.9 unknown rows, 4.1.1 retirement and role-label normalisations.
- [ ] Actions production deployment would fail rather than publish demo data if a source import is incomplete.
- [ ] Manual checks in [ACCESSIBILITY-TEST-PLAN.md](ACCESSIBILITY-TEST-PLAN.md) are scheduled; automated passes are not treated as conformance.
