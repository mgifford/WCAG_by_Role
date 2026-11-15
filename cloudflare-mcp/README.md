# WCAG by Role MCP server

A read-only [Model Context Protocol](https://modelcontextprotocol.io/) server for the
published WCAG by Role dataset. It exposes W3C WCAG 2.2 criterion references and W3C
ARRM task wording and ownership to MCP clients.

**Status:** implemented, locally verified, and manually deployed at
<https://wcag-by-role-mcp.mike-gifford.workers.dev/mcp>. The GitHub Pages workflow does not
run `wrangler deploy`; deployment remains manual and opt-in.

GitHub Pages (`https://mgifford.github.io/WCAG_by_Role/`) cannot host or run this server.
It only serves the static dataset and explorer. The MCP endpoint is a separate runtime
deployment on Cloudflare Workers: the public endpoint is
`https://wcag-by-role-mcp.mike-gifford.workers.dev/mcp` and the local endpoint is
`http://localhost:8787/mcp`.

This directory previously held a contract only. The contract is now implemented in
[`src/`](src/) and is validated by [`test/mcp.test.mjs`](test/mcp.test.mjs). See
[`../docs/CLOUDFLARE_MCP.md`](../docs/CLOUDFLARE_MCP.md) for the design decisions and
remaining operational steps.

## Protocol validation (November 2026)

The server uses the current stateless Cloudflare handler, not the deprecated
`McpAgent` Durable Object pattern:

| Component | Version | Source |
| --- | --- | --- |
| MCP specification | `2026-07-28` (stateless) | <https://modelcontextprotocol.io/specification/2026-07-28/changelog> |
| Legacy compatibility | `2025-11-25` | Cloudflare `legacy: "stateless"` lane |
| Cloudflare Agents SDK | `0.33.0` | <https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/> |
| MCP server SDK | `@modelcontextprotocol/server` `2.4.0` | official SDK v2 |
| Wrangler | `4.162.0` | local dev and deployment |

`createMcpHandler` creates a fresh `McpServer` for every request. There is no Durable
Object, MCP session, WebSocket or server-side per-user state. Both the current
`2026-07-28` era (including `server/discover`) and the legacy `2025-11-25` handshake are
covered by the integration tests.

## Architecture

```text
data/source/role-data.yaml (canonical production snapshot)
        │
        ├── scripts/build_dataset.py   validate + canonical hash
        │        │
        │        └── src/generated/dataset.json + meta.json  (gitignored)
        │
        └── src/tools.ts ── six read-only tools
                    │
             src/index.ts ── createMcpHandler (stateless Streamable HTTP)
                    │
             https://<worker>/mcp
```

The dataset is **baked in at build time**. The Worker makes no runtime network requests,
accepts no arbitrary URLs and has no cache to invalidate. Deploying a new source snapshot
requires rebuilding and redeploying the Worker.

The build refuses a snapshot whose `mode` is not `production`. Demo fixtures can never be
deployed through this path.

## Tools

| Tool | Purpose | Bounds |
| --- | --- | --- |
| `get_dataset_info` | Revision, counts, source hashes, citation and distribution URLs | Fixed size |
| `search_accessibility` | Search criteria and ARRM tasks by text, criterion number or task ID | `limit` 1-50, 200-character query, opaque cursor |
| `get_criterion` | One criterion, W3C links, informative summary, criterion-level ARRM summary and related tasks | Up to 50 related tasks |
| `get_arrm_task` | One ARRM task, verbatim wording and every recorded primary, secondary and contributor role | One task |
| `get_role_guidance` | Explicit missing-review status plus original ARRM task records (or bounded counts) | Counts, or up to 50 tasks for one criterion |
| `compare_roles` | Recorded role assignments for one criterion or one task | One criterion or task, at most 50 tasks |

Every successful result and every domain error includes a `provenance` object with the
dataset revision, dataset SHA-256, schema version, WCAG version, W3C source URLs and
source hashes, plus an explicit `w3cEndorsed: false` attribution. A protocol-level schema
rejection (for example an unknown argument key) is issued by the MCP SDK before any
dataset access, so it carries no dataset payload or provenance.

The server never infers responsibility from a criterion summary, never treats a missing
assignment as an exemption, and never generates conformance or role advice.

`get_role_guidance` is deliberately honest: no independently reviewed per-criterion role
guidance is published, so it returns `guidanceStatus: "missing-reviewed-interpretation"`,
an empty `interpretationRecords` array, and (when a criterion or task is supplied) the
original ARRM task records for the role.

## Run locally

Prerequisites: Node.js 22+, pnpm 11+, Python 3.9+ and PyYAML.

```sh
python3 -m pip install -r requirements.txt   # from the repository root
cd cloudflare-mcp
pnpm install
pnpm dev
```

`pnpm dev` rebuilds `src/generated/` from the canonical YAML and starts Wrangler. The MCP
endpoint is `http://127.0.0.1:8787/mcp`; the human-readable page is
`http://127.0.0.1:8787/`.

Connect with any MCP client that supports remote Streamable HTTP. For example, an MCP
Inspector session:

```sh
npx @modelcontextprotocol/inspector@latest
```

Then use `http://127.0.0.1:8787/mcp` as the transport URL. Opening `/mcp` in a browser
does not start a session; it returns `405`.

If Wrangler cannot create `~/Library/Preferences/.wrangler` in a sandboxed environment,
set `XDG_CONFIG_HOME` to a writable directory inside the workspace.

## Test

```sh
cd cloudflare-mcp
pnpm typecheck
pnpm test
```

`pnpm test` starts a real `wrangler dev` process and connects with the official
`@modelcontextprotocol/client` over Streamable HTTP. It checks:

- the current `2026-07-28` era and the legacy `2025-11-25` era;
- the exact six-tool contract and strict input schemas;
- pagination without duplicates, bounded snippets and exact lookup;
- separation of criterion-level ARRM summaries from task-level ownership;
- not-recorded semantics for unassigned roles;
- provenance and production mode on every dataset result;
- unknown ids, unknown roles, ambiguous arguments and malformed cursors;
- 404/405 handling, the 64 KiB request-body cap and the `429` rate limit.

`wrangler deploy --dry-run` bundles the Worker at 1.43 MiB (249 KiB gzip), below the
Cloudflare Workers free-plan limit, and confirms the rate-limit binding without deploying.

The manual deployment at `https://wcag-by-role-mcp.mike-gifford.workers.dev/mcp` was
checked after launch: `/health` returns the production bundle (86 criteria, 262 tasks,
`sha256:60bd47e0…`), and the official client connects in both the `2026-07-28` and
`2025-11-25` eras, lists all six tools and returns provenance-bearing search results.

Data checks:

```sh
python3 scripts/build_dataset.py --check
python3 scripts/build_dataset.py --verify-against ../dist/data/role-data.json
```

The second command is useful after a production site build. It fails if criteria, tasks,
roles or source hashes differ, and it warns if only the import timestamp (`generatedAt`)
differs — a site rebuild can update that timestamp without changing source content.

## Deploy (manual, opt-in)

Deployment is intentionally not connected to GitHub Actions. The current deployment is
`https://wcag-by-role-mcp.mike-gifford.workers.dev/mcp` on the free `workers.dev` route.

```sh
cd cloudflare-mcp
python3 scripts/build_dataset.py --verify-against ../dist/data/role-data.json
pnpm run deploy
```

Use `pnpm run deploy`, not `pnpm deploy`: pnpm has its own built-in `deploy` command
for workspace packages.

Before deploying:

1. Set the public URL. **A custom domain is not required.** Workers provides a free
   `workers.dev` subdomain, so the default route is
   `https://wcag-by-role-mcp.<account>.workers.dev/mcp`. A custom domain is optional
   branding, not a deployment prerequisite.
2. For a custom domain, set `MCP_ALLOWED_HOSTS` in `wrangler.toml` to a comma-separated
   hostname list (without scheme or port). This also becomes the browser `Origin`
   allowlist. Include every hostname clients use.
3. Review the rate limit in `wrangler.toml` (`120 requests / 60 seconds`, approximate and
   applied per Cloudflare location). The in-Worker body cap is 64 KiB.
4. Review `[observability]` and Cloudflare account permissions. Use a scoped deployment
   token; do not commit secrets.
5. Re-run `pnpm test` against the deployed endpoint if the client configuration allows it.

`pnpm run deploy` runs `wrangler deploy`. It does not run during `pages.yml`, and no
credentials or deployment token are stored in this repository.

### If `wrangler login` fails with a CSRF/session error

A Cloudflare OAuth response such as `request_forbidden: No CSRF value available in the
session cookie` is a browser-session problem, not a Worker problem. Try, in order:

1. Device flow (no localhost callback and no OAuth session cookie dependency):

   ```sh
   pnpm exec wrangler login --device
   ```

   Open the printed verification URL, approve the request, then run `pnpm run deploy`.

2. A clean browser session: log out of all Cloudflare accounts, clear cookies for
   `cloudflare.com` and `dash.cloudflare.com`, allow cookies for the login flow, disable
   tracking prevention/ad blockers for that tab, and use a private window or Chrome.

3. An API token instead of OAuth:

   ```sh
   read -rs CLOUDFLARE_API_TOKEN   # paste an API token; it is not echoed or stored
   export CLOUDFLARE_API_TOKEN
   read -rs CLOUDFLARE_ACCOUNT_ID
   export CLOUDFLARE_ACCOUNT_ID
   pnpm exec wrangler whoami
   pnpm run deploy
   ```

   Create the token at <https://dash.cloudflare.com/profile/api-tokens>. For this Worker,
   Account → Workers Scripts → Edit is the essential permission; add Workers Routes → Edit
   for a custom domain. Do not commit the token or paste it into chat. `CLOUDFLARE_ACCOUNT_ID`
   lets Wrangler skip account discovery when the token cannot list memberships.

### Data freshness

The Worker serves the snapshot embedded at deploy time. When the production pipeline
updates `data/source/role-data.yaml`, rebuild the site and the Worker from that same
revision, then redeploy. `--verify-against` is the guard against drift.

## Security and privacy

- Read-only, anonymous, stateless. No cookies, analytics or per-user storage.
- No arbitrary URL fetching, so there is no SSRF surface in the tool layer.
- Strict Zod input schemas reject unknown keys; identifiers and roles must match the
  dataset exactly.
- Request bodies are capped at 64 KiB; results are capped at 96 KiB.
- The Cloudflare Rate Limiting binding returns `429` with `Retry-After: 60`. It is
  approximate and per location; use the WAF or a Durable Object if a strict global quota
  is required.
- Browser `Origin` headers and `Host` headers are validated by `createMcpHandler`.
  Non-browser MCP clients do not send `Origin` and remain valid.
- The landing page sends a restrictive CSP, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` and a no-referrer policy. It has no JavaScript.

## Accessibility

The human-readable landing page at `/` is semantic HTML with one `h1`, a skip link,
visible focus styling, a 320 px reflow-safe layout, light/dark colour schemes and
`prefers-reduced-motion` support. It has no scripts or external assets.

Automated checks on 2026-11-14 found no axe-core violations (WCAG 2.0/2.1/2.2 A and AA
tags) in light, dark or forced-colours mode, and no horizontal overflow at a 320 px
viewport. The first Tab press focused the skip link. Axe reported `color-contrast` as
incomplete; the declared pairs were checked manually and range from 6.39:1 to 17.22:1.
These are regression evidence, not a WCAG conformance claim. No screen-reader or manual
assistive-technology session is claimed.

## Attribution and limits

The project is independent and is not endorsed by W3C. WCAG 2.2 and ARRM wording and
ownership remain subject to their publishers' terms. ARRM tasks are advisory; a missing
task does not remove a WCAG obligation. See [`../NOTICE.md`](../NOTICE.md).

There is no reviewed role interpretation layer, no authentication, no MCP Registry
registration and no automated deployment in this change.
