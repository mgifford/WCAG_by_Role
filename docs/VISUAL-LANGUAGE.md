# Visual language and icons

The site uses original, inline SVG line icons. They add orientation without importing third-party artwork, icon fonts or data.

## Licensing decision

| Source | Finding | Decision |
| --- | --- | --- |
| Oobee / Purple Hats | Repository is MIT, but its UI bundles **Font Awesome Free 5.15.4**; that bundle states icons are **CC BY 4.0**, fonts **SIL OFL 1.1**, code MIT. The disability categories in the current repository are text badges, not custom artwork. | Not reused. Reuse would require Font Awesome attribution and a separate licence notice. |
| AAArdvark WCAG in Plain English | Custom inline SVG icons and original editorial taxonomy. No explicit reuse licence was found on the article, credits or disclaimer pages. | Not reused. Treat as all rights reserved. |
| Original project icons | Created for this project; MIT with the rest of the code. | Used in `web/visuals.js`. |

This is a record of the review, not legal advice. Do not add an icon or illustration to the repository without recording its source and licence.

## Icon inventory

### ARRM task categories

| Category | Icon concept |
| --- | --- |
| Images and Graphs | Picture frame |
| Semantic Structure | Hierarchy nodes |
| Input Modalities | Pointer/cursor |
| Form Interactions | Field inside a form |
| CSS and Presentation | Brush and stroke |
| Navigation | Compass |
| Data Tables | Table grid |
| Animation and Movement | Play/motion lines |
| Static Content | Document lines |
| Dynamic Interactions | Refresh arrows |
| Other ARRM tasks | Three dots fallback |

### Role guides

| Role | Icon concept |
| --- | --- |
| Visual Design | Palette |
| Front-End Development | Code brackets |

### Functional-needs groups

The explorer includes a **Who accessibility affects** overview. These are project groups for orientation, not a diagnosis, a complete disability taxonomy or a per-criterion impact mapping.

| Group | Icon | Standards reference |
| --- | --- | --- |
| Vision | Eye | Section 508 FPC WV, LV |
| Colour perception | Colour wheel | Section 508 FPC WPC; EN 301 549 4.2.3 |
| Hearing | Ear | Section 508 FPC WH, LH; EN 301 549 4.2.4, 4.2.5 |
| Cognition and learning | Head | Section 508 FPC LLCLA; EN 301 549 4.2.10 |
| Motor and manipulation | Hand | Section 508 FPC LM, LRS; EN 301 549 4.2.7, 4.2.8 |
| Speech | Speech bubble | Section 508 FPC WS; EN 301 549 4.2.6 |
| Photosensitivity | Lightning | EN 301 549 4.2.9 |
| Privacy | Lock | EN 301 549 4.2.11 |

References: [Section 508 Functional Performance Criteria](https://www.access-board.gov/ict/#chapter-3-functional-performance-criteria) and [EN 301 549 v3.2.1](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf). Grouping is editorial; the standards remain authoritative.

The accessibility-impact knowledge layer is linked in the resources section as **proposed/unreviewed**. No impact record is imported or shown per criterion yet; that needs a data-specific licence and human review.

## Accessibility rules

- Icons are inline SVG with `aria-hidden="true"` and `focusable="false"` when adjacent visible text carries the meaning.
- If an icon is ever used without visible text, provide a `<title>` and `role="img"`; this project does not currently do that.
- Icons use `currentColor` and 1.8px strokes, with a 24×24 viewBox.
- Minimum rendered size is 16×16 for inline category navigation and 24×24 for headings; role cards use 32×32.
- Non-text contrast must be at least 3:1 against the adjacent background. The `--accent` colour is used in light and dark modes.
- Never use colour or icon alone to communicate responsibility, disability group or level.
- No animation, flashing or auto-playing effects.
- Icons remain visible in forced-colours mode; borders and text use system colours.
- Test dark mode, forced colours, 320 CSS px reflow and print.
- No external icon fonts, CDN requests, background images or `<img>` assets are used for the interface icons.

## Adding or changing an icon

1. Add the icon shape to `ICONS` in `web/visuals.js`, using the 24×24 grid and stroke-only geometry.
2. Add it to `CATEGORY_ICONS`, `ROLE_ICONS` or `FUNCTIONAL_NEEDS` as appropriate.
3. Keep visible text next to the icon; the icon is decorative.
4. Run `pnpm test:e2e` and confirm the decorative-SVG, dark/forced-colour, reflow and axe tests.
5. Record the source and licence here. Do not paste third-party SVG paths unless the licence explicitly permits reuse and attribution is added.
6. Update `NOTICE.md` if a third-party asset is ever introduced.

## WCAG 2.2 success-criterion pictograms

The repository includes a supplied pictogram sprite and mapping:

- `web/wcag22-icons.svg` — 86 success-criterion symbols and 13 guideline symbols.
- `web/wcag22-icons-mapping.json` — mapping version 1.0, including criterion number, level, W3C URL and an `icon_description` for every symbol.

The sprite was supplied for this project by the repository owner on 2026-11-13. Its metadata names the W3C WCAG 2.2 Recommendation as the reference source; the artwork is not a W3C publication and is not W3C-endorsed. No separate reuse licence was supplied with the artwork, so it is included here with the owner's permission and should not be extracted for reuse elsewhere without permission. The mapping is used only to verify coverage and IDs.

The 86 success-criterion drawings are referenced with:

```html
<svg class="sc-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <use href="./wcag22-icons.svg#sc-2-4-7"></use>
</svg>
```

They appear next to the visible criterion number and name on explorer cards and role-guide criteria lists. They are decorative: the criterion title is the accessible text, so no duplicate `img` role or alt text is announced. Each icon sits in a white tile so its original palette remains legible in dark mode; forced-colours mode preserves the tile and adds a system border. `tests/test_icons.py` checks 86 SC symbols, 13 guideline symbols, mapping/symbol agreement, no duplicate IDs, no 4.1.1 and no scripts/remote references.

If the sprite or mapping is updated, replace both files together, keep `wcag22-icons-mapping.json` in sync, and rerun `tests/test_icons.py` plus the pictogram Playwright tests.

## Current limits

- The functional-needs overview is not a filter and does not map criteria to disability groups.
- It does not replace the ARRM task ownership model.
- It does not claim to represent every disabled person or every combination of needs.
- The icon set is intentionally small; adding every possible concept would increase ambiguity rather than clarity.
