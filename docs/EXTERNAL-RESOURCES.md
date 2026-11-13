# External resource links

The site links to selected independent resources without copying their text or importing their datasets. This is a convenience layer, not a new normative source, a responsibility model or a conformance checklist.

## Policy

- **Link only.** No third-party explanation text, axe rule descriptions or disability-impact records are copied into this repository.
- **No endorsement.** Every resource is labelled external where it is not W3C material. AAArdvark, The WCAG and DigitalA11y are identified as commercial sites.
- **No new tab.** Links do not use `target="_blank"`; they carry `rel="external"` and `data-external="true"`.
- **No assignment.** External resources are never used to infer ARRM primary, secondary or contributor ownership.
- **No analytics or tracking parameters.** URLs are used as published.
- **Keep W3C first.** WCAG 2.2, Understanding and ARRM remain the authoritative/informative sources; the resource section is secondary.

## Per-criterion plain-language links

Four external sites provide per-criterion links:

```text
https://simplewcag.org/criteria/{number-with-dashes}-{slug}/
https://aaardvarkaccessibility.com/wcag-plain-english/{number-with-dashes}-{slug}/
https://thewcag.com/criteria/{number}
https://www.digitala11y.com/... (explicit map, or ?s={number} search fallback)
```

Example for 2.4.7:

- https://simplewcag.org/criteria/2-4-7-focus-visible/
- https://aaardvarkaccessibility.com/wcag-plain-english/2-4-7-focus-visible/
- https://thewcag.com/criteria/2.4.7
- https://www.digitala11y.com/focus-visible-understanding-sc-2-4-7/

On 2026-11-13:

- Simple WCAG and AAArdvark patterns resolved for all **86 active WCAG 2.2 criteria** with HTTP 200 and no redirects.
- The WCAG `/criteria/{number}` pattern resolved for all **86** with HTTP 200.
- DigitalA11y has **55 direct criterion articles** in the checked sitemap/checklist. The other **31** use a labelled `?s={number}` site-search fallback; no direct article was found, and no URL was invented.

URLs are generated in `web/resources.js` from `number`/`slug`; the checked DigitalA11y direct map is in `web/digitala11y-links.js`. No third-party explanation text is stored.

`Simple WCAG` describes its explanations as interpretations for educational purposes; no explicit reuse licence was found. `AAArdvark WCAG in Plain English`, `The WCAG` and `DigitalA11y` are commercial resources. All are link-only here.

## General resource list

The explorer and role guides include a collapsible **More accessibility resources (external)** list:

| Group | Resource | Notes |
| --- | --- | --- |
| Authoritative | WCAG 2.2, Understanding, ARRM tasks, ARRM roles, WAI Quick Reference | W3C sources |
| Plain language | Simple WCAG, AAArdvark WCAG in Plain English, The WCAG, DigitalA11y | Independent; AAArdvark, The WCAG and DigitalA11y are commercial |
| Testing and rules | axe-core rule descriptions, CivicActions accessibility-data-reference, Purple Hats/Oobee project | Automated rules are not conformance evidence |
| Standards and impact | Section 508 FPC, Section 508 WCAG-to-FPC, EN 301 549 v3.2.1, accessibility-impact knowledge layer | Separate from ARRM ownership |

All 16 general resource URLs returned HTTP 200 with a browser-style user agent on 2026-11-13. The ETSI PDF rejects some non-browser clients; it is linked for human readers.

## Source files reviewed

| File | Link | Use here |
| --- | --- | --- |
| axeTypes | [axeTypes.yaml](https://github.com/CivicActions/accessibility-data-reference/blob/main/axeTypes.yaml) | axe rule ID → disability/WCAG reference; not ARRM ownership |
| WCAG links | [wcagLinks.yaml](https://github.com/CivicActions/accessibility-data-reference/blob/main/wcagLinks.yaml) | WCAG 2.1-era links; not imported |
| axeTypes ↔ FPC | [axeType2FPC.yaml](https://github.com/CivicActions/accessibility-data-reference/blob/main/axeType2FPC.yaml) | Disability/FPC comparison; not imported |
| WCAG → FPC | [mapping-wcag-to-fpc.csv](https://github.com/CivicActions/accessibility-data-reference/blob/main/mapping-wcag-to-fpc.csv) | Section 508 FPC crosswalk; not imported |
| EN 301 549 → FPS | [EN301549-to-FPS.csv](https://github.com/CivicActions/accessibility-data-reference/blob/main/EN301549-to-FPS.csv) | EN 301 549 functional-performance mapping; not imported |
| axe rule descriptions | [rule-descriptions.md](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) | Testing reference; not a requirement source |
| Accessibility impact | [criteria.json](https://github.com/mgifford/openacr-release-evidence/blob/main/data/accessibility-impact/wcag/2.2/criteria.json) | Proposed/unreviewed criterion impact; link only |

These files were reviewed for possible use. None are copied into this repository.

## Why the datasets are not imported

| Dataset | Licence / status | Decision |
| --- | --- | --- |
| CivicActions `accessibility-data-reference` | CC BY-SA 4.0 | Link only. Importing adapted data would need attribution/share-alike review. Its `wcagLinks` targets WCAG 2.1 and its axe data is rule-oriented, not ARRM task ownership. |
| Purple Hats/Oobee `axeTypes` and `wcagLinks` | Project MIT; converted data now referenced through CivicActions | Link only. The original Purple Hats paths have moved to Oobee; `wcagLinks` is WCAG 2.1-era and `axeTypes` maps axe rules, not role responsibilities. |
| axe-core rule descriptions | MPL-2.0 | Link only. Useful as a testing reference, not as a WCAG requirement. |
| `openacr-release-evidence` accessibility-impact | AGPL-3.0; 86 records **proposed**, 0 reviewed; Section 508 mapping reviewed, EN 301 549 pending | Link only for now. Importing it would need a data-specific licence decision and human review. It must never be presented as reviewed fact or used to assign ARRM responsibility. |
| Section 508 FPC / EN 301 549 mappings | Standards plus third-party crosswalks | Link only. A future separate standards view could present them; they do not belong in the role-ownership model. |

## Artwork and icons

Oobee's repository is MIT, but its UI bundles Font Awesome Free 5.15.4 (icons CC BY 4.0, fonts SIL OFL 1.1). Its current disability categories are text badges, not custom artwork. AAArdvark's plain-English icons are custom inline SVG with no explicit reuse licence found, so they are not copied. The site uses original icons; see [VISUAL-LANGUAGE.md](VISUAL-LANGUAGE.md).

## Adding a resource

1. Add a per-criterion template to `CRITERION_RESOURCE_TEMPLATES` or a global entry to `GENERAL_RESOURCES` in `web/resources.js`. If the site has irregular per-criterion URLs, add an explicit checked map such as `web/digitala11y-links.js`; do not guess slugs.
2. Label independent/commercial sources clearly; do not copy their prose.
3. Add a Playwright assertion in `tests/e2e/resources.spec.js` for the link, label, `rel` and no `target` attribute.
4. Update this document with the licence/status and validation date.
5. If the resource has a per-criterion pattern, validate all active criteria before merging.
6. Do not make the resource required for the page to function.

## Known limits

- Link patterns can change without notice. The last full check is recorded above; `pnpm test:links` checks the generated URL shapes, not live availability.
- DigitalA11y's `Search DigitalA11y` fallback is an honest gap marker, not a dedicated article.
- External sites may change content, add tracking or change access terms. The project does not mirror or vouch for their current content.
- A working link is not evidence that the explanation is accurate, complete or appropriate for a given team.
