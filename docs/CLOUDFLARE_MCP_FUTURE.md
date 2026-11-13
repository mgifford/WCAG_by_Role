# Cloudflare remote MCP: future deployment checklist

**Status: explicitly deferred.** This code package does not implement, validate
or deploy a remote MCP server. The `cloudflare-mcp-future/` folder holds a tool
contract and architecture notes only. GitHub Pages remains a static publisher.

## Existing prerequisites supplied by this PR

- Public, content-addressable JSON and documented CSV/YAML downloads.
- A stable `data/manifest.json` with source hashes and revision timestamp.
- Canonical static URLs for criteria, tasks, roles and comparisons.
- Explicit rights, attribution, review boundaries and provenance.

## Choices to make before writing the Worker

1. **Public URL**: choose `https://<worker>.<account>.workers.dev/mcp` or an
   MCP-specific subdomain, without interfering with GitHub Pages.
2. **Protocol**: use the current MCP Streamable HTTP transport and an officially
   supported Cloudflare Agents SDK implementation. Avoid legacy deprecated
   `McpAgent` patterns for a stateless public dataset.
3. **Server model**: use a read-only, stateless handler with no per-user state or
   Durable Object unless a real future requirement emerges.
4. **Source**: use the already published immutable/versioned JSON artifact or
   a build-deployed asset. Decide how to cache it and when to invalidate caches
   after GitHub Actions deploys a new source snapshot.
5. **Permissions**: for public read-only data, anonymous access may be
   appropriate, but rate limiting and request-size limits are still necessary.
   Private datasets would require authentication and scoped authorization.
6. **Tool design**: implement a small bounded tool set using strict schemas,
   pagination and hard result-size limits. Return source URLs, revision hashes,
   review status and the distinction between W3C source and project analysis.
7. **Safety**: validate all tool inputs, avoid SSRF via arbitrary input URLs,
   permit only expected dataset URLs, reject unknown role IDs, and never
   generate conformance determinations or infer task ownership.
8. **Operations**: set up a Cloudflare account and an appropriately scoped
   deployment token, configure Wrangler, secrets and domain routing, then
   explicitly opt in to deployment and integration tests.
9. **Testing**: MCP Inspector compatibility, tool schemas, proper `POST`
   handling, error codes, cache freshness, read limits, source attribution,
   rate limits, malformed input, and accessible documentation. None of these
   MCP validation tasks is claimed as complete in the present handoff.
10. **Discovery**: only after launch, register the tested endpoint in the MCP
    Registry (if suitable), and document client connection examples.

## Tools worth exposing later

See `cloudflare-mcp-future/planned-tools.json` for a draft contract:

- `get_dataset_info`: version, source hashes, distribution URLs.
- `search_accessibility`: bounded search of criteria, task IDs and text.
- `get_criterion`: original source references and related task IDs.
- `get_arrm_task`: task text and recorded ownership by role.
- `get_role_guidance`: only explicitly reviewed interpretation records;
  otherwise original task descriptions and explicit missing-review status.
- `compare_roles`: evidence-backed matrix of assignments, never invented work.

## Cloudflare documentation to consult at implementation time

- https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/
- https://developers.cloudflare.com/workers/get-started/guide/
- https://modelcontextprotocol.io/specification/

Dependencies and API names change quickly. When implementation is authorized,
regenerate the Worker from the **then-current** Cloudflare remote MCP template,
not an older blog post or a pinned unverified SDK signature. Deploying the
static site does not deploy the Worker, and `wrangler deploy` should not be
added to the GitHub Pages workflow without explicit approval.
