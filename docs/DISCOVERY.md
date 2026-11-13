# Search and AI discovery layer

This is a static, source-traceable publishing layer for WCAG by Role. It adds
crawlable HTML, machine-readable distributions and discoverability metadata.
It is **not** a new WCAG standard, AI-generated interpretation, conformance
assessment or remote MCP server.

## Install

Copy the overlay with the supplied `apply_to_repo.py`, or copy the files and
add the two GitHub Actions steps by hand. Do not replace the existing importer.

The build order is important:

1. Run `scripts/pipeline.py --mode production` (fetch/normalize W3C sources).
2. Run `scripts/migrate_source.py --input dist/data/role-data.json --yaml-out data/source/role-data.yaml --json-out dist/data/role-data.json`.
3. Run `scripts/publish_discovery.py --dist dist --source-yaml data/source/role-data.yaml --base-url https://mgifford.github.io/WCAG_by_Role/ --repo-root .`.
4. Publish the `dist/` directory using the existing GitHub Pages Actions job.

For a local offline demo, skip `--source-yaml` after `pipeline.py --mode demo`:

```sh
python3 scripts/pipeline.py --mode demo
python3 scripts/publish_discovery.py --dist dist --repo-root .
python3 -m http.server 8000 --directory dist
```

Do not pass the canonical **production** YAML to the demo build; the publisher
correctly rejects a mismatch rather than substituting data across modes.

## Output

- `/roles/` and `/roles/{role}/` static role guides (5 roles).
- `/criteria/` and `/criteria/{criterion-number}-{slug}/` static criterion pages.
- `/tasks/` and `/tasks/{ARRM-task-id}/` static task pages.
- `/compare/{criterion-number}/` static task responsibility comparison pages.
- `/data/` dataset landing page with Schema.org `Dataset` JSON-LD.
- `/data/role-data.json`, `/data/role-data.yaml` and `/data/import-audit.json`.
- `/data/criteria.csv`, `/data/tasks.csv`, `/data/role-matrix.csv`, `/data/roles/{role}.csv`.
- `/data/manifest.json`, `/data/dataset.jsonld`, `/data/discovery-build.json`.
- `/sitemap.xml`, `/llms.txt`, per-page canonical URLs and JSON-LD.
- Shared, locally hosted SVG/PNG/ICO favicons, a touch icon and social preview asset.

The publisher only reads the normalized `dist/data/role-data.json`, optional
exact-match canonical `data/source/role-data.yaml`, existing role profiles,
and shipped static files. HTML is generated with escaped text. There are no
network requests or generative AI in this step.

**Original task descriptions and ownership levels are imported unchanged from
ARRM.** In the static matrix, a role with no recorded assignment is shown as
`Not recorded`, not as an exemption. Role-specific professional explanations
will be added only from independently authored, reviewed interpretation data.
The publisher never manufactures that content.

## URL and canonical policy

Set the `PUBLIC_BASE_URL` GitHub Actions repository variable to the **exact
public origin and path**, including a trailing slash. The default is:

```
https://mgifford.github.io/WCAG_by_Role/
```

When moving to a custom domain, update `PUBLIC_BASE_URL` and configure that
domain in the repository's GitHub Pages settings. Rebuild the entire site so
canonical links, sitemap, JSON-LD and dataset URLs all agree. Use permanent
redirects for old URLs where possible, and avoid indexing both origins.

The former `role.html?role=...` JavaScript experience remains usable but gets a
`noindex,follow` meta tag. New static guides are canonical. Existing filters
remain functional. The homepage links to static indexes.

## robots.txt, sitemap and llms.txt

A file hosted at `https://mgifford.github.io/WCAG_by_Role/robots.txt` does **not**
control crawler policy for the hostname `mgifford.github.io`. Robots rules are
interpreted at the **host root** (`https://mgifford.github.io/robots.txt`). The
repository's existing `web/robots.txt` is left unchanged. For now submit the
actual `https://mgifford.github.io/WCAG_by_Role/sitemap.xml` URL to search
consoles. With a dedicated custom domain, serve `robots.txt` at that host root
and include the canonical sitemap URL there.

`llms.txt` is intentionally optional and experimental. It is a human-readable
index of canonical links and does not confer AI search ranking or endorsement.

## Structured data

- Pages use `WebPage` or `CollectionPage` with W3C source URLs and a snapshot date.
- The data landing page uses `Dataset` + `DataDownload` for actual distributions.
- No blanket `license` is asserted for the combined dataset because W3C WCAG,
  W3C ARRM, independently authored material and software have different rights.
- CSV exports are spreadsheet-formula-safe for viewing in spreadsheet software.
- JSON-LD is serialized safely to prevent HTML/script tag injection.

Do not use `FAQPage` structured data to manufacture search rich results. Do not
claim that structured data guarantees an AI citation, ranking or indexing.

## What to measure

Submit the canonical sitemap to Google Search Console and Bing Webmaster
Tools. Review index coverage, server responses, duplicate canonical pages,
rendered accessibility, search impressions and referral quality. No invasive
analytics are required. A clean automated scan is not an accessibility
conformance claim; also conduct keyboard, NVDA, VoiceOver, reflow, high-contrast
and manual content reviews.

## Important limitations

- The source `summary` is not the full normative WCAG criterion. Link to the
  W3C Recommendation for exact requirements and exceptions.
- A task may record more than one ARRM ownership level for a role.
- A criterion summary is **not** a task ownership assignment.
- An omitted task does not remove any WCAG obligation.
- The published content is predominantly English; this release does not create
  translations or claim localized WCAG guidance.
- The project does not currently publish independently verified interpretive
  text for every role and task. Do not generate placeholder advice to fill gaps.
- Search and AEO outcomes must be evaluated after public deployment.

## Verification

```sh
python3 -m unittest tests.test_discovery -v
python3 scripts/pipeline.py --mode demo
python3 scripts/publish_discovery.py --dist dist
python3 -m http.server 8000 --directory dist
```

Verify that `sitemap.xml` only lists real static HTML pages, all links work from
a nested GitHub Pages path, canonical URLs are stable, and demo builds do not
appear in production. Also run the existing Playwright and axe-core suites.

### Persona and communication profile discovery

The publisher also copies existing validated `data/exports/personas.json` and
`personas.csv` if present, five `data/role-profiles/*.yaml` files, canonical
`data/personas/*.yaml` files, and source YAML schemas. Their distribution URLs
and content hashes appear in the manifest and data landing page. These are
**fictional, unvalidated professional archetypes**, not official ARRM roles or
W3C-endorsed descriptions. Their presence never alters imported ownership.

Raw draft interpretation files are **not** published automatically. A future
editorial stage must enforce review status and source-revision matching before
any interpretation becomes publicly downloadable or indexable.
