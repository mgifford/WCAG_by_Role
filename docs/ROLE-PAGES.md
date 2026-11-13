# Role guides

The generic explorer remains the complete role/level/task view. Role guides are a task-oriented entry point for a professional role, built from the same normalized data. The five guides cover every role that has task-level assignments in the imported ARRM CSVs; other ARRM roles are intentionally not invented.

## URLs

| Purpose | URL |
| --- | --- |
| Visual Design guide | `role.html?role=visual-design` |
| Front-End Development guide | `role.html?role=front-end-development` |
| Unknown/missing role | `role.html` (chooser) |
| Task category anchor | `role.html?role=visual-design#category-css-and-presentation` |
| Task anchor | `role.html?role=visual-design#task-INP-017` |
| Criterion anchor | `role.html?role=visual-design#sc-2-4-7` |

The role is query-string state because GitHub Pages serves static files. Categories, success-criterion groups, tasks and criteria use native fragment identifiers. Deep links are resolved after the data renders; `role-page.js` opens the containing task disclosure, highlights and focuses the target without adding client-side routing.

## Components

```text
role-data.json ─────┬── index.html + app.js ── generic explorer
                    │        └── role-cards.js ── links to role guides
                    └── role.html + role-page.js ── role guide
                             ├── role-config.js ── role copy + category map
                             ├── role-cards.js ── chooser cards
                             ├── resources.js ── link-only external resources
                             ├── visuals.js ── original icons + functional needs
                             └── dom.js ── shared DOM helpers
```

- `web/role-config.js` is the single place to add a role guide. Its `slug`, `role` and handoff copy are used by the role template and the explorer cards.
- `web/role-page.js` contains the shared role-page renderer. It does not know about individual roles beyond the config entry.
- `web/dom.js` and `web/role-cards.js` avoid duplicating DOM and card construction with the explorer.
- No pipeline or data-model change is required. The role must already exist in `role-data.json`; otherwise the guide shows an empty state rather than inventing assignments.

## How responsibilities are selected

For each task, `roleTasks` includes the task when the selected role appears in at least one of `ownership.primary`, `ownership.secondary` or `ownership.contributor`. The guide presents:

- a category heading, such as **Semantic Structure** or **Form Interactions**;
- each success criterion that has tasks in that category, with its number, name, level and Understanding link;
- the original ARRM task text as bullets under the criterion;
- the selected role's level(s) as visible responsibility badges on each bullet;
- a **Related tasks and source** disclosure per criterion, containing stable task IDs, every primary/secondary/contributor assignment, and ARRM/WCAG/Understanding source links;
- link-only plain-language explanations from Simple WCAG, AAArdvark, The WCAG and DigitalA11y, labelled external and specific to each criterion, in both the criterion groups and the criteria list;
- original category and role icons (decorative, with visible text);
- the supplied WCAG 2.2 success-criterion pictogram in each criterion heading and the criteria list.

A task ID is kept in the disclosure rather than shown as the primary label. Task text and responsibility are visible; the ID, all role assignments and sources remain available without requiring people to decode `SEM-001` in the main list.

If a criterion has tasks with different ARRM task-prefix categories, it appears under each relevant category with only that category's tasks. This preserves the category navigation and avoids moving a task out of the ARRM grouping that produced it.

Task IDs are stable ARRM identifiers. The guide never infers an owner from a criterion-level summary or from another task.

## Task categories

Categories are a project navigation aid, not a WCAG taxonomy or a new responsibility model. The names come from the section headings on the [W3C ARRM tasks page](https://www.w3.org/WAI/planning/arrm/tasks/). The mapping uses the task ID prefix because the CSV does not carry a category column:

| Prefix | ARRM category |
| --- | --- |
| IMG | Images and Graphs |
| SEM | Semantic Structure |
| INP | Input Modalities |
| FRM | Form Interactions |
| CSS | CSS and Presentation |
| NAV | Navigation |
| TAB | Data Tables |
| ANM | Animation and Movement |
| SCT | Static Content |
| DYN | Dynamic Interactions |

Unknown prefixes are grouped under **Other ARRM tasks** rather than dropped. The category order follows the order of sections on the ARRM tasks page. Only categories containing a task for the selected role are shown, so the five roles receive different navigation lists from the same data.

The role-specific "Largest task groups" line is computed from the current snapshot. It is a starting point, not a prioritisation standard.

## Current production snapshot

From the 2026-11-12 live import (86 criteria, 262 tasks):

| Role | Unique tasks | Criteria | Primary | Secondary | Contributor |
| --- | --- | --- | --- | --- | --- |
| Business Analysis | 9 | 7 | 1 | 5 | 3 |
| Content Authoring | 85 | 36 | 42 | 33 | 10 |
| User Experience (UX) Design | 189 | 71 | 96 | 87 | 7 |
| Visual Design | 66 | 33 | 30 | 29 | 7 |
| Front-End Development | 130 | 45 | 93 | 32 | 5 |

Counts are task-level assignments. A task can appear at more than one level, so the three level counts can sum to more than the unique task count. The live deployed figures may be newer than this table; the guide always renders from the current `role-data.json`.

## Collaboration and handoff

The collaboration section is derived from the same ARRM task assignments:

- it lists roles that share at least one task with the selected role;
- it reports the number of shared tasks and the levels involved;
- task groups show all assignments, not only the selected role;
- each criterion's related-task disclosure lists every task in that category group and its sources.

The handoff bullets are **project guidance**, explicitly labelled as not a W3C requirement. They do not prescribe a sequence, a workflow engine or a handoff artifact. The guide does not assign ownership where ARRM is silent.

## Visual language

The criteria list uses the supplied `web/wcag22-icons.svg` symbol for each criterion. Category headings and category navigation use original inline SVG icons from `web/visuals.js`. The role heading and role cards use a palette/code icon. Icons are decorative, `aria-hidden`, use `currentColor`, and never replace a text label or responsibility level.

The explorer's **Who accessibility affects** overview uses eight functional-needs groups aligned with Section 508 FPC and EN 301 549 references. It is orientation, not a diagnosis, a complete disability taxonomy or a per-criterion mapping. See [VISUAL-LANGUAGE.md](VISUAL-LANGUAGE.md) for the icon inventory, licensing review and accessibility rules. No Oobee or AAArdvark artwork is reused.

## External resources

Criterion cards, role-guide criterion groups and the role-guide criteria list link to four independent plain-language sites. DigitalA11y uses a labelled site-search fallback where no dedicated article was found. The role-guide sources section and the explorer include a collapsible list of testing, standards-mapping and impact references. These are link-only: no third-party text or mapping data is copied, and none of it assigns ARRM ownership.

The accessibility-impact data is currently **proposed/unreviewed** and its repository is AGPL-3.0, so it is linked rather than imported. See [EXTERNAL-RESOURCES.md](EXTERNAL-RESOURCES.md) for licence status, validation dates and the policy for adding links.

## Missing source information

Role guides use task-level ownership, so a missing criterion-level responsibility summary does not remove a task. The guide does not display a criterion summary as if it were task ownership. The generic explorer carries the criterion-level summary and its distinction; the [import audit](AUDIT.md) records missing summaries and unknown or retired ARRM criteria.

The known 3.2.7–3.2.9 / 3.3.7–3.3.9 numbering issue is tracked in [w3c/wai-arrm#141](https://github.com/w3c/wai-arrm/issues/141). Do not create a duplicate issue; update this guide if that issue or the CSV changes.

## Adding another ARRM role

1. Confirm the canonical role label in `role-data.json`.
2. Add an entry to `ROLE_GUIDES` in `web/role-config.js` with a slug, title, intro, card copy, explorer query and handoff bullets.
3. Add the slug to `ROLE_ORDER`.
4. Run `python3 scripts/pipeline.py --mode demo` and `pnpm test:e2e`.
5. Add role-specific Playwright coverage when the role has meaningfully different categories or ownership patterns.

No HTML shell, Python pipeline change or new data file is needed. The chooser and explorer cards pick up `ROLE_ORDER` automatically.

## Scope boundaries

This implementation does not add:

- CSV/JSON export (a later PR);
- a workflow engine, task management integration or editable assignments;
- AI-generated summaries or conformance claims;
- imported third-party impact, axe or standards-mapping datasets;
- a backend, client-side routing dependency or new normative model.
