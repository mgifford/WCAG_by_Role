# Accessibility verification plan

Unit tests validate import rules, not actual accessibility. Perform these manual and automated checks before a public production release.

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
| Automated | Playwright/axe-core on demo and production builds, HTML validation and dependency scanning |

Record the browser, OS, AT version, date, findings and reviewer. Do not claim conformance based on this plan alone.
