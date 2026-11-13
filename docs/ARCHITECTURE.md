# Architecture and data model

## Purpose

Reorganize existing WCAG 2.2 criteria around roles and responsibilities while keeping the standard unchanged.

```text
W3C WCAG wcag.json ────────────────┐
ARRM arrm-all-tasks.csv ───────────┤
ARRM arrm-wcag-sc.csv ─────────────┤── Python importer + validation
Understanding page In Brief ──────┘       │
                                          ├── data/source/role-data.yaml (canonical snapshot)
                                          │        │  validate + read back
                                          │        └── dist/data/role-data.json
                                          └── dist/data/import-audit.json
                                                  │
                                     Static HTML + CSS + JavaScript
                                                  │
                                           GitHub Pages
```

The primary join key is the WCAG criterion number, such as `2.4.7`. Task IDs remain independent and stable. The normalized source also preserves normative and informative source URLs, canonical slug, WCAG level, and ARRM role relationships.

### Static discovery layer

After the production YAML is validated, `scripts/publish_discovery.py` reads `dist/data/role-data.json` and writes static crawlable role, criterion, task, comparison and data pages under `dist/`, plus CSV/JSON/YAML distributions, a sitemap, JSON-LD, shared icons and `llms.txt`. It does not call the network, an LLM or a Cloudflare Worker. The interactive app remains at `/` and `role.html`; static pages are canonical for search. `role.html` is `noindex,follow`. The `cloudflare-mcp-future/` directory is a tool contract only; no MCP server is shipped.

### Persona layer

`data/personas/*.yaml` is the canonical source for five fictional professional archetypes, one per ARRM role with task data. `scripts/export_personas.py` validates the YAML against `schemas/persona.schema.yaml` and deterministically generates `data/exports/personas.json` and `personas.csv`. `data/role-profiles/*.yaml` links each role to its persona. The five portraits are cached under `web/assets/personas/`, with source URLs and SHA-256 hashes in `data/exports/avatar-manifest.json`; the published site never contacts RoboHash. Persona text is independently authored, marked `unvalidated-draft`, and never changes WCAG/ARRM ownership or requirements.

### Canonical YAML source and generated JSON

`data/source/role-data.yaml` is the reviewable production source snapshot. The importer first normalizes W3C/ARRM inputs; `scripts/migrate_source.py` then writes the YAML, validates it with `schemas/role-data.schema.yaml`, reads it back and regenerates `dist/data/role-data.json`. The browser continues to consume JSON during the incremental transition. Do not hand-edit source wording or ownership in YAML: regenerate, review the diff and keep the source hashes with the snapshot.

The YAML build step uses PyYAML from `requirements.txt`; it is not shipped to the browser. The static site has no runtime YAML or Python dependency. Round-trip tests compare the YAML and JSON data exactly, so a serialization change cannot silently drop fields.

### Record schema (abbreviated)

The current `schemaVersion` is `3`. Schema 2 added canonical role labels, explicit audit metadata and the `authorTask` Understanding field. Schema 3 adds `criterionSummaryStatus` so a missing ARRM criterion-level summary is distinguishable from a recorded summary that does not assign a role. See [AUDIT.md](AUDIT.md) for the source snapshot that exercised it.

```json
{
  "schemaVersion": 3,
  "criteria": [{
    "number": "2.4.7", "slug": "focus-visible", "name": "Focus Visible", "level": "AA",
    "normativeUrl": "https://www.w3.org/TR/WCAG22/#focus-visible",
    "understandingUrl": "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html",
    "arrmResponsibilities": {"Visual Design": ["primary", "secondary"]},
    "criterionSummaryStatus": "recorded",
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

## Role guides

Role guides are a second presentation of the same `role-data.json`, not a second dataset:

```text
role-data.json ─────┬── index.html + app.js ── generic explorer
                    │        └── role-cards.js
                    └── role.html + role-page.js ── role guide
                             ├── role-config.js
                             ├── role-cards.js
                             ├── resources.js
                             ├── visuals.js
                             └── dom.js
```

- `role.html?role=<slug>` is a static page for each of the five ARRM roles. The query string selects the role; fragments (`#task-INP-017`, `#sc-2-4-7`, `#category-css-and-presentation`) are resolved after render and focused without a client-side router.
- `web/role-config.js` holds the role copy, URL slug, explorer query and ARRM task-prefix category map. `web/role-page.js` is the shared renderer; adding a role requires a config entry, not a new HTML page or pipeline change.
- Categories are project navigation derived from the [W3C ARRM tasks page](https://www.w3.org/WAI/planning/arrm/tasks/) section headings and task ID prefixes. They are not a WCAG taxonomy, a new standard or a re-assignment of responsibility. Unknown prefixes stay visible under **Other ARRM tasks**.
- Every task card shows the stable ARRM task ID, original task text, all primary/secondary/contributor assignments, and links to the WCAG criterion and Understanding document. The selected role is highlighted with text, not colour alone.
- The collaboration list is derived from shared ARRM tasks. Handoff bullets are labelled project guidance; they are not W3C requirements or a workflow model.
- `web/resources.js` holds link-only plain-language and general resource links. Criterion URLs are generated from `number` + `slug`; no third-party explanation text or mapping data is imported. External links carry `rel="external"` and no `target`; AAArdvark is labelled commercial.
- `web/wcag22-icons.svg` and `web/wcag22-icons-mapping.json` are the supplied 86-SC pictogram sprite and mapping. Criterion cards and role criteria lists reference symbols by `number`; icons are decorative because the criterion title remains the accessible text. The sprite is not W3C-endorsed and is not relicensed under MIT; see [VISUAL-LANGUAGE.md](VISUAL-LANGUAGE.md).
- `web/visuals.js` holds original, diagnostic-free line icons and the functional-needs groups. Icons are inline SVG, `aria-hidden`, `currentColor`, and always paired with visible text. The functional-needs overview is orientation, not a per-criterion impact mapping or a new responsibility model. No third-party icon font, image or SVG is bundled; see [VISUAL-LANGUAGE.md](VISUAL-LANGUAGE.md).
- Criterion-level responsibility summaries are not used to decide task ownership on role pages. Missing task-level data is shown as missing, not inferred.
- `criterionSummaryStatus` is `recorded` when the ARRM criterion CSV has a row for the criterion, even if that row assigns none of its roles, and `missing` when the CSV has no row. `criteriaWithoutCriterionSummary` contains only `missing` records.
- The explorer computes level filtering client-side. A conformance target is cumulative (`A` < `AA` < `AAA`); exact-level filtering is independent. Role and ownership filters do not change either meaning. Neither control establishes conformance.

See [ROLE-PAGES.md](ROLE-PAGES.md) for the role model, category mapping and extension steps. Schema version 3 and the pipeline's import semantics are unchanged by this presentation layer.

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

The versioned YAML source and generated JSON allow clients beyond GitHub Pages. Any breaking changes require a `schemaVersion` increment and a migration note. Schema 3 is documented here; clients should ignore unknown fields and must not treat a missing task or missing summary as an exemption.
