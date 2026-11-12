# Accessibility verification plan

Unit tests validate import rules, not actual accessibility. Playwright and axe-core catch a narrow set of regressions; they do not establish usability or conformance. Perform these manual and automated checks before a public production release.

**A clean automated run is not a WCAG conformance claim.** axe-core decisions cover only the rules it implements and cannot judge meaningful text, logical focus order, screen-reader output, real forced-colours rendering, zoom quality or whether the ARRM mapping is appropriate for a team.

Record manual evidence with [MANUAL-TEST-TEMPLATE.md](MANUAL-TEST-TEMPLATE.md).

| Area | Minimum check |
| --- | --- |
| Keyboard | Navigate every form control, results link, and disclosure with keyboard only; visible focus everywhere |
| Screen readers | Test at least VoiceOver + Safari and NVDA + Firefox or equivalent, including filter changes and result count |
| Zoom and reflow | 200% and 400% browser zoom, 320 CSS px width, no two-dimensional scrolling for ordinary content |
| Forced colors | Windows High Contrast / CSS forced-colors; controls, focus, borders and badges remain visible |
| Color scheme | Test light and dark, including text/controls contrast |
| Reduced motion | Respect prefers-reduced-motion; no unnecessary animation |
| Landmarks and headings | Correct main, navigation, form search region, article and heading order |
| Live updates | Result counts are announced without repeatedly interrupting users; no keyboard focus loss |
| Links | Each criterion has an unambiguous accessible link to the official norm and an Understanding link |
| Source integrity | Role filters do not hide requirements when all-criteria option is enabled |
| Role guides | Visual Design and Front-End Development guides show task IDs, all role assignments, collaborators, category navigation and WCAG/Understanding links |
| Role guides | A task such as INP-017/INP-018 shows both Visual Design and Front-End Development responsibilities, with the selected role highlighted by text |
| Role guides | Category, task and criterion anchors are stable; browser back/forward and direct links work |
| Automated | Playwright/axe-core on the demo build in light and dark schemes, task view, keyboard, emulated forced colours, 320 px reflow and reduced motion |
| Automated limits | axe-core does not test screen-reader output, real Windows High Contrast, zoom quality, link purpose in context or data correctness |
| Build integrity | Production import rejects missing headers, empty sources and undersized datasets; retired 4.1.1 Parsing stays out of live views |
| Post-deploy | `scripts/smoke_site.py` verifies production mode, audit counts, source hashes, retired 4.1.1 exclusion and main assets on the live URL |

## Automated commands used in CI

```sh
python3 -m unittest discover -s tests -v
python3 scripts/pipeline.py --mode demo
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
python3 scripts/smoke_site.py --url https://mgifford.github.io/WCAG_by_Role/
```

The Playwright suite currently covers:

- Filter combinations, task view, search, reset and URL round-trips at the nested `/dist/` path.
- axe-core WCAG A/AA tags in light and dark schemes and in the task view.
- Keyboard tab order to the filters, native select typeahead, and focus retention after a filter change.
- Emulated `forced-colors: active` focus outline and component borders.
- 320 CSS-pixel reflow, reduced motion, and the polite result-count live region.
- Role guide rendering, category navigation, task-level ownership, collaborating roles, deep links, invalid-role chooser, keyboard reachability, forced-colours focus and axe-core scans for both guides.
- The post-deploy smoke test checks the live production artefact against the same audit contract; it does not test accessibility.

## Evidence still required from people

1. **Screen readers:** VoiceOver + Safari and NVDA + Firefox. Record announcements for role/ownership/level changes, result count, the *In Brief* disclosure, ownership badges and "no matching task" text.
2. **Keyboard:** full manual pass in at least two browsers; verify visible focus at every control and no trap.
3. **Forced colours:** real Windows High Contrast / forced-colors, not only emulation. Check focus, badges, borders, skip link and selected state.
4. **Zoom and reflow:** 200% and 400% browser zoom and 320 CSS px; no clipped content or two-dimensional scrolling for ordinary content.
5. **Contrast:** light and dark, including hover, focus and badge text, with a contrast checker.
6. **Print:** filters hidden, cards not split badly, links still understandable.
7. **Content and mapping:** review with Visual Design, Front-End Development, UX and WCAG/ARRM experts. Confirm that task-level ownership, the criterion-level summary and the 3.3.7–3.3.9 gap are represented without implying exemption or exclusive ownership.
8. **Link context:** listen to and read each normative/Understanding link in context; automated link checks only prove a URL resolves.
9. **Role guides:** read both guides with a screen reader and keyboard only; confirm the selected role, all collaborating roles, category jumps and task/criterion anchors are understandable.

## Role-based usability scenarios

Record these in the manual test record. Do not coach the participant through the expected path; note where wording, navigation or task-level ownership is misunderstood.

| Scenario | User task | What to observe |
| --- | --- | --- |
| Visual Design | "Find the responsibilities for designing keyboard focus indicators, identify the developer's responsibilities, and locate the relevant WCAG guidance." | Can the user find the Visual Design guide, 2.4.7, INP-017 and INP-018; can they see Front-End Development's primary ownership of INP-018 and the WCAG/Understanding links? |
| Front-End Development | "Find the tasks for implementing accessible form errors, identify related responsibilities belonging to other roles, and locate authoritative implementation guidance." | Can the user reach Form Interactions or search, identify the ARRM tasks, see Visual Design/UX/content collaborators, and distinguish task guidance from the normative criterion? |
| General user | "Find the criteria relevant to Level AA conformance and explain why the role-specific tasks do not constitute a full conformance checklist." | Does the user understand the difference between the current exact-level filter and a future A/AA/AAA conformance target; do they see the limitations notice? |

Record the browser, OS, AT version, date, findings and reviewer. Do not claim conformance based on this plan, axe-core or Playwright alone.
