# Architecture and data model

## Purpose

Reorganize existing WCAG 2.2 criteria around roles and responsibilities while keeping the standard unchanged.

```text
W3C WCAG wcag.json ────────────────┐
ARRM arrm-all-tasks.csv ───────────┤
ARRM arrm-wcag-sc.csv ─────────────┤── Python importer + validation
Understanding page In Brief ──────┘       │
                                          ├── dist/data/role-data.json
                                          └── dist/data/import-audit.json
                                                  │
                                     Static HTML + CSS + JavaScript
                                                  │
                                           GitHub Pages
```

The primary join key is the WCAG criterion number, such as `2.4.7`. Task IDs remain independent and stable. The JSON import also preserves normative and informative source URLs, canonical slug, WCAG level, and ARRM role relationships.

### Record schema (abbreviated)

The current `schemaVersion` is `2`. Schema 2 adds canonical role labels, explicit audit metadata and the `authorTask` Understanding field. See [AUDIT.md](AUDIT.md) for the source snapshot that exercised it.

```json
{
  "schemaVersion": 2,
  "criteria": [{
    "number": "2.4.7", "slug": "focus-visible", "name": "Focus Visible", "level": "AA",
    "normativeUrl": "https://www.w3.org/TR/WCAG22/#focus-visible",
    "understandingUrl": "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html",
    "arrmResponsibilities": {"Visual Design": ["primary", "secondary"]},
    "inBrief": {"goal": "Users know which element has keyboard focus.",
                "whatToDo": "Ensure each item receiving focus has a visible indicator.",
                "whyImportant": "Without a focus indicator, sighted keyboard users cannot operate the page."}
  }],
  "tasks": [{
    "id": "INP-017", "criterion": "2.4.7",
    "text": "Every element that receives keyboard focus is designed to display a visible focus indicator.",
    "ownership": {"primary": ["Visual Design"], "secondary": ["User Experience (UX) Design"], "contributor": []}
  }]
}
```

The value of `criteria[].arrmResponsibilities` is W3C's *criterion-level summary*. It is informational and must not be substituted for `tasks[].ownership` when filtering. More than one role can be primary on the same criterion for different tasks.

`inBrief` uses the labels published by W3C. Most pages use `whatToDo`; two pages use `authorTask`, and the UI shows the original `Author task` label rather than renaming it. A partial extract is still shown, with a note that the official Understanding document remains the source.

## Import semantics

- Accept a WCAG criterion only if `versions` contains `2.2` **and** `level` is `A`, `AA` or `AAA`.
- Record obsolete WCAG criteria in `retiredWCAG`, including 4.1.1 Parsing.
- Reject and log task and summary records that do not map to an active criterion; do not silently discard them.
- Parse ARRM role names as comma-separated lists, treating `none` as no assignment.
- Canonicalize known ARRM role spelling variants through the explicit `ROLE_ALIASES` manifest. The original task wording and ownership flags are not changed. Each rewrite is recorded in `roleNormalizations`; unknown labels are preserved and stay visible rather than being guessed.
- Preserve native criterion and task wording. The importer copies the criterion name and a W3C-supplied plain-language `title`, not its full normative markup.
- Report, but do not rewrite, task rows whose `Level` disagrees with the WCAG criterion level. The UI uses the WCAG level.
- Fetch Understanding pages when requested, extracting only unchanged *In Brief* text. Parsing failures and partial sections are logged and do not block the normative+ARRM import.
- Missing ARRM tasks do not imply a criterion is not applicable or that a role lacks responsibilities. Missing criterion-level summaries are reported, not inferred.
- Required CSV headers are validated. A missing column or empty source fails with the source name in the error. Upstream headers and WCAG success-criterion keys are stored in `sourceSchema` so schema drift is reviewable.
- Retired criteria (for example 4.1.1 Parsing) are retained only in `retiredWCAG` and `excludedARRM`. Active criteria and tasks must never contain them.

## Security, privacy, resilience

- No browser analytics, API keys, client-side AI, or personal data collection.
- All rendered source text uses `textContent` or text nodes. Do not use untrusted HTML via `innerHTML`.
- Production uses HTTPS W3C and GitHub raw content with bounded download retries, including `Retry-After` handling for HTTP 429, and a minimum dataset size gate.
- Source data is fetched at build time, not on every browser request. The site works without network calls after static assets are downloaded.
- Production gates fail closed on a malformed/truncated source, missing required headers, an empty responsibility source, fewer than 80 active criteria, fewer than 180 tasks or fewer than four roles. Understanding fetch failures are warnings because the official links remain usable.
- Use versions/source URLs and build timestamps for reproducibility. The importer records SHA-256 hashes of the WCAG JSON and ARRM CSV inputs, plus source-schema fingerprints. For stronger reproducibility later, pin upstream commit SHAs and store immutable source archives.
- The deployed page never assumes a backend. `web/` is copied to `dist/`, relative URLs keep nested GitHub Pages paths working, and `dist/` is generated rather than committed.

## Audit fields

`dist/data/import-audit.json` includes `retiredWCAG`, `excludedARRM`, `unknownARRMCriteria`, `retiredARRMCriteria`, `unmappedCriteria`, `criteriaWithoutCriterionSummary`, `taskLevelMismatches`, `roleNormalizations`, `unrecognizedOwnershipValues`, `understandingFetchIssues`, `understandingPartialBriefs`, `warnings`, `sourceSchema`, `counts` and source hashes. These are provenance and review aids; they are not a conformance assessment.

## Planned schema changes

Versioned JSON allows clients beyond GitHub Pages. Any breaking changes require a `schemaVersion` increment and a migration note. Schema 2 is documented here; clients should ignore unknown fields and must not treat a missing task as an exemption.
