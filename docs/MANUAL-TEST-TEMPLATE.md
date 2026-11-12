# Manual accessibility test record

Copy this file to `docs/MANUAL-TEST-YYYY-MM.md`, complete it against the deployed URL, and link the result in the pull request or release note. Do not describe the site as conforming on the basis of this record or the automated suite.

## Session metadata

| Field | Value |
| --- | --- |
| Date | |
| Reviewer | |
| Deployed URL | https://mgifford.github.io/WCAG_by_Role/ |
| Deploy run / commit | |
| Browser and version | |
| Operating system | |
| Assistive technology and version | |
| Display / contrast settings | |
| Zoom level(s) | |
| Viewport width(s) | |

## Automated evidence (record, do not substitute)

| Check | Result / link |
| --- | --- |
| Python tests | |
| Playwright / axe-core | |
| Post-deploy smoke test | |
| axe-core version | |
| Playwright version | |

A clean automated result is regression evidence only. axe-core cannot judge meaningful link text, logical focus order, screen-reader output, real forced-colours rendering, zoom quality or whether the ARRM mapping suits a team.

## Manual checks

Use **Pass**, **Fail** or **N/A**. Add evidence paths for failures and non-obvious passes.

| Area | Check | Result | Notes / evidence |
| --- | --- | --- | --- |
| Keyboard | Tab reaches skip link, all filters, reset, source links, disclosures and task links | | |
| Keyboard | Visible focus on every control, including selected tabs/options and checkboxes | | |
| Keyboard | No keyboard trap; focus is not lost after a filter change | | |
| Keyboard | Role, responsibility, level, view and search can be changed by keyboard alone | | |
| Screen reader | Page title, landmarks, headings and search region announced correctly | | |
| Screen reader | Role/responsibility changes and result count announced without repeated interruption | | |
| Screen reader | Task-level primary/secondary/contributor badges read in a meaningful order | | |
| Screen reader | Criterion-level ARRM summary is distinguishable from task ownership | | |
| Screen reader | *In Brief* disclosure, including the `Author task` label, opens and reads correctly | | |
| Screen reader | "No matching ARRM task" message does not imply exemption | | |
| Reflow | 200% zoom: no clipped content or loss of functionality | | |
| Reflow | 400% zoom / 320 CSS px: no two-dimensional scrolling for ordinary content | | |
| Forced colours | Real Windows High Contrast: focus, borders, badges, skip link and selected state visible | | |
| Colour | Light mode contrast for text, links, badges, focus and disabled/empty states | | |
| Colour | Dark mode contrast for the same states | | |
| Reduced motion | `prefers-reduced-motion` respected and content still usable | | |
| Print | Filters hidden; cards not split awkwardly; links understandable | | |
| Content | Normative and Understanding links are unambiguous in context | | |
| Content | 4.1.1 Parsing is not presented as a live WCAG 2.2 requirement | | |
| Data | Role filter does not hide active criteria when "include criteria with no matching task" is on | | |
| Data | A criterion with tasks owned by different roles shows each task's own assignment | | |

## Findings

| ID | Barrier and task impact | Candidate WCAG SC | Severity | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| M-01 | | | | | |

Describe the barrier and its impact before citing a success criterion. Candidate SCs are for discussion, not a conformance verdict. File actionable follow-ups rather than only recording them here.

## Sign-off

| Question | Answer |
| --- | --- |
| Were all automated checks green? | |
| Were all applicable manual checks completed? | |
| Are open findings linked to issues? | |
| Is any claim of conformance being made? | **No** |

This record documents a review. It is not a conformance assessment, certification or legal opinion.
