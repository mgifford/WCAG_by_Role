# Cloudflare remote MCP server

**Status: implemented and manually deployed.** The live endpoint is
<https://wcag-by-role-mcp.mike-gifford.workers.dev/mcp>. The read-only server lives in
[`cloudflare-mcp/`](../cloudflare-mcp/). GitHub Pages remains a static publisher and the
Pages workflow does not run `wrangler deploy`. The MCP endpoint is **not** hosted at
`https://mgifford.github.io/WCAG_by_Role/`; static Pages hosting cannot run it.

This document records the design decisions the earlier deferred checklist asked for. The
implementation was built against the current MCP specification and the current Cloudflare
handler API, not a pinned blog-post example.

## Live endpoint

- MCP: <https://wcag-by-role-mcp.mike-gifford.workers.dev/mcp>
- Human-readable server page: <https://wcag-by-role-mcp.mike-gifford.workers.dev/>
- Health and dataset revision: <https://wcag-by-role-mcp.mike-gifford.workers.dev/health>

The route uses the free `workers.dev` subdomain. No custom domain is required. The static
site at `mgifford.github.io` links to the endpoint but does not host or run it.

## Protocol and runtime choices

| Decision | Choice | Reason |
| --- | --- | --- |
| Current specification | MCP `2026-07-28` (stateless) | Current revision; no protocol sessions or `Mcp-Session-Id`. |
| Legacy compatibility | `2025-11-25` stateless lane | Keeps existing MCP clients working without a Durable Object. |
| Transport | Streamable HTTP at `/mcp` | Required remote transport; SSE-only is deprecated. |
| Cloudflare API | `createMcpHandler` from `agents/mcp/server` | Current stateless handler; `McpAgent` is deprecated. |
| Server shape | Fresh `McpServer` per request | No per-user state, no Durable Object, no WebSocket. |
| Authentication | Anonymous public read-only | The published dataset is public; add OAuth only if a private dataset appears. |
| Data loading | Build-time bundle | No runtime fetch, no SSRF, no cache invalidation problem. |

Validated versions at implementation time:

- MCP specification `2026-07-28`: <https://modelcontextprotocol.io/specification/2026-07-28/changelog>
- Cloudflare stateless handler: <https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/>
- Cloudflare remote MCP guide: <https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/>
- `agents` `0.33.0`, `@modelcontextprotocol/server` `2.4.0`, `@modelcontextprotocol/client`
  `2.4.0`, Wrangler `4.162.0`, Zod `4.6.7`.

## Data flow and freshness

```text
data/source/role-data.yaml  (canonical production snapshot)
        │
        ├── cloudflare-mcp/scripts/build_dataset.py
        │        validates production mode, counts, roles, ids and ownership
        │        writes src/generated/dataset.json + meta.json
        │
        └── Worker bundle (deploy-time)
```

The build fails on a non-production snapshot, so demo fixtures cannot be deployed through
this path. The Worker never fetches GitHub Pages or W3C sources at request time.

**Freshness rule:** when the production pipeline updates the canonical YAML, rebuild the
site and the Worker from that same revision, then redeploy. The command

```sh
python3 cloudflare-mcp/scripts/build_dataset.py --verify-against dist/data/role-data.json
```

fails when criteria, tasks, roles or source hashes differ. It warns when only the import
timestamp differs, because a site rebuild can update `generatedAt` without changing source
content. The current site manifest and Worker share the same criteria, tasks and source
hashes but have different import timestamps.

## Tool contract

The original contract is [`cloudflare-mcp/planned-tools.json`](../cloudflare-mcp/planned-tools.json);
the implementation is [`cloudflare-mcp/src/tools.ts`](../cloudflare-mcp/src/tools.ts).

| Tool | Returns | Important limit |
| --- | --- | --- |
| `get_dataset_info` | Revision, counts, source hashes, citation, distribution URLs | Fixed |
| `search_accessibility` | Criterion and task matches with truncated snippets | 1-50 per page; cursor |
| `get_criterion` | Criterion, W3C links, informative summary, criterion-level ARRM summary, related tasks | 50 tasks |
| `get_arrm_task` | Verbatim task wording, stage and all recorded ownership | One task |
| `get_role_guidance` | Explicit missing-review status, original task records or bounded counts | 50 tasks |
| `compare_roles` | Recorded role matrix or task assignment | One record |

Every dataset result and every domain error carries a `provenance` object: dataset
revision, dataset SHA-256, schema version, WCAG version, source URLs, source SHA-256
values, and the explicit non-endorsement note. Protocol-level schema rejections are
issued by the MCP SDK before dataset access and carry no dataset payload.

## Safety decisions

- **No inference.** Criterion-level ARRM summaries are returned in a separate field with a
  note that they are not task-level ownership. A role with no recorded task assignment is
  labelled "not recorded", not exempt.
- **No fabrication.** No reviewed per-criterion role guidance exists, so
  `get_role_guidance` says so, returns an empty interpretation list and includes the
  original ARRM task records. It does not generate advice.
- **No conformance claims.** Tool descriptions and responses state that the server does not
  diagnose issues or determine WCAG conformance.
- **No arbitrary URLs.** Identifiers are validated against the bundled dataset. There is no
  fetch tool and no user-supplied URL parameter.
- **Bounded input and output.** Request bodies are capped at 64 KiB, tool results at
  96 KiB, search at 50 results per page, and identifiers and queries have explicit limits.
- **Rate limiting.** A Cloudflare Rate Limiting binding applies approximately 120 requests
  per 60 seconds per location. A `429` response includes `Retry-After: 60`. This is not a
  strict global quota; use a Durable Object if that is required.
- **Origin and Host validation.** `createMcpHandler` validates browser `Origin` headers and
  Host values. Non-browser MCP clients without `Origin` remain valid. A custom domain must
  be added to `MCP_ALLOWED_HOSTS`.
- **Accessible human page.** `/` is semantic, script-free HTML with a skip link, focus
  styles, reflow-safe layout and light/dark/forced-colours support. `/mcp` is the protocol
  endpoint, not a browser page.

## Verification performed

- `pnpm typecheck` passes.
- `pnpm test` starts a real Wrangler server and uses the official MCP client in both the
  `2026-07-28` and `2025-11-25` eras. It covers all six tools, provenance, pagination,
  strict schemas, not-recorded semantics, error codes, 404/405, the body cap and the 429
  rate limit.
- `python3 scripts/build_dataset.py --check` confirms the generated bundle is current.
- `wrangler deploy --dry-run` bundles at 1.43 MiB (249 KiB gzip) and exposes the rate-limit
  binding; no deployment is performed.
- Automated axe-core checks on `/` found no violations at WCAG 2.0/2.1/2.2 A and AA in
  light, dark and forced-colours mode. At 320 px there was no horizontal overflow and the
  first Tab press focused the skip link. Axe marked `color-contrast` incomplete; declared
  colour pairs were checked manually at 6.39:1 to 17.22:1. These are regression evidence,
  not a conformance claim. No screen-reader session is claimed.
- MCP Inspector was not run in this environment; the official MCP SDK client exercises the
  same Streamable HTTP handshake, tool listing and tool calls. The browser-based
  Playwright/axe checks used a locally cached Chromium rather than the pinned CI build.
- The manual deployment was re-checked after launch: `/health` returns the production
  bundle (86 criteria, 262 tasks, dataset `60bd47e0…`), and the official client connects in
  both the `2026-07-28` and `2025-11-25` eras, lists six tools and returns provenance on a
  search result.

## Deployment status

Completed:

1. A public `workers.dev` URL was chosen; no custom domain was purchased.
2. The account was authenticated and the manual deployment succeeded.
3. The deployed endpoint passes the post-launch health and client checks above.
4. The static data page, homepage and `llms.txt` now link to the endpoint; the Pages
   publisher does not run or proxy it.

Still to do:

1. Add the live endpoint to client-specific documentation and consider MCP Registry
   registration now that it is launched.
2. Manual screen-reader, zoom/reflow and forced-colours review of `/` and `/mcp` before
   claiming accessibility conformance.
3. If a custom domain is ever added, set `MCP_ALLOWED_HOSTS` and re-test Origin/Host
   handling.
4. If a private dataset or write operation is ever added, add authentication,
   authorization and an audit trail first. The current server is deliberately read-only
   and anonymous.
5. Re-run the post-deploy smoke check whenever `data/source/role-data.yaml` changes and the
   Worker is redeployed.

The Pages workflow must not be changed to run `wrangler deploy` without explicit approval.
