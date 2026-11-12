# Accessibility verification plan

Unit tests validate import rules, not actual accessibility. Playwright and axe-core catch a narrow set of regressions; they do not establish usability or conformance. Perform these manual and automated checks before a public production release.

**A clean automated run is not a WCAG conformance claim.** axe-core decisions cover only the rules it implements and cannot judge meaningful text, logical focus order, screen-reader output, real forced-colours rendering, zoom quality or whether the ARRM mapping is appropriate for a team.

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
| Automated | Playwright/axe-core on the demo build in light and dark schemes, task view, keyboard, emulated forced colours, 320 px reflow and reduced motion |
| Automated limits | axe-core does not test screen-reader output, real Windows High Contrast, zoom quality, link purpose in context or data correctness |
| Build integrity | Production import rejects missing headers, empty sources and undersized datasets; retired 4.1.1 Parsing stays out of live views |

## Automated commands used in CI

```sh
python3 -m unittest discover -s tests -v
python3 scripts/pipeline.py --mode demo
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

The Playwright suite currently covers:

- Filter combinations, task view, search, reset and URL round-trips at the nested `/dist/` path.
- axe-core WCAG A/AA tags in light and dark schemes and in the task view.
- Keyboard tab order to the filters, native select typeahead, and focus retention after a filter change.
- Emulated `forced-colors: active` focus outline and component borders.
- 320 CSS-pixel reflow, reduced motion, and the polite result-count live region.

## Evidence still required from people

1. **Screen readers:** VoiceOver + Safari and NVDA + Firefox. Record announcements for role/ownership/level changes, result count, the *In Brief* disclosure, ownership badges and "no matching task" text.
2. **Keyboard:** full manual pass in at least two browsers; verify visible focus at every control and no trap.
3. **Forced colours:** real Windows High Contrast / forced-colors, not only emulation. Check focus, badges, borders, skip link and selected state.
4. **Zoom and reflow:** 200% and 400% browser zoom and 320 CSS px; no clipped content or two-dimensional scrolling for ordinary content.
5. **Contrast:** light and dark, including hover, focus and badge text, with a contrast checker.
6. **Print:** filters hidden, cards not split badly, links still understandable.
7. **Content and mapping:** review with Visual Design, Front-End Development, UX and WCAG/ARRM experts. Confirm that task-level ownership, the criterion-level summary and the 3.3.7–3.3.9 gap are represented without implying exemption or exclusive ownership.
8. **Link context:** listen to and read each normative/Understanding link in context; automated link checks only prove a URL resolves.

Record the browser, OS, AT version, date, findings and reviewer. Do not claim conformance based on this plan, axe-core or Playwright alone.
