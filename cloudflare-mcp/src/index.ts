import { createMcpHandler, type StatelessMcpHandler } from 'agents/mcp/server';
import { META, PROVENANCE } from './dataset';
import { TOOL_NAMES, createServer } from './tools';

export interface Env {
  /** Optional comma-separated hostnames for a custom domain (no scheme or port). */
  MCP_ALLOWED_HOSTS?: string;
  /** Cloudflare Rate Limiting binding configured in wrangler.toml. */
  MCP_RATE_LIMITER?: RateLimit;
}

const MAX_BODY_BYTES = 64 * 1024;
const MCP_PATH = '/mcp';

const defaultHandler = createMcpHandler(createServer, {
  route: MCP_PATH,
  legacy: 'stateless',
  responseMode: 'auto',
});

function allowedHosts(env: Env): string[] {
  return (env.MCP_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function handlerFor(env: Env): StatelessMcpHandler {
  const hosts = allowedHosts(env);
  if (hosts.length === 0) return defaultHandler;
  return createMcpHandler(createServer, {
    route: MCP_PATH,
    legacy: 'stateless',
    responseMode: 'auto',
    allowedHostnames: hosts,
    allowedOriginHostnames: hosts,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function securityHeaders(headers: Headers): Headers {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  return headers;
}

function withSecurityHeaders(response: Response, extra?: HeadersInit): Response {
  const headers = securityHeaders(new Headers(response.headers));
  if (extra) {
    for (const [name, value] of new Headers(extra)) {
      if (!headers.has(name)) headers.set(name, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload: unknown, status: number, extra?: HeadersInit): Response {
  return withSecurityHeaders(new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  }), extra);
}

function provenanceError(code: string, message: string, status: number, extra?: HeadersInit): Response {
  return jsonResponse({ error: { code, message }, provenance: PROVENANCE }, status, extra);
}

function landingPage(requestUrl: string): string {
  const endpoint = new URL(MCP_PATH, requestUrl).toString();
  const counts = META.dataset.counts;
  const tools: ReadonlyArray<readonly [string, string]> = [
    ['get_dataset_info', 'Revision, source hashes, citation and distribution URLs.'],
    ['search_accessibility', 'Bounded search of criteria and ARRM tasks (1-50 results, cursor).'],
    ['get_criterion', 'One WCAG criterion, W3C links, summary and related ARRM tasks.'],
    ['get_arrm_task', 'One ARRM task and every recorded ownership assignment.'],
    ['get_role_guidance', 'Explicit missing-review status, original task records or bounded counts.'],
    ['compare_roles', 'Recorded assignments for one criterion or task, without inference.'],
  ];
  const toolItems = tools
    .map(([name, purpose]) => `<li><code>${escapeHtml(name)}</code>: ${escapeHtml(purpose)}</li>`)
    .join('\n          ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>WCAG by Role MCP server</title>
  <meta name="description" content="Read-only, source-traceable Model Context Protocol access to WCAG 2.2 and W3C ARRM task data.">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --text: #1b1b1b;
      --muted: #4a4a4a;
      --link: #0b57d0;
      --rule: #c7c7c7;
      --panel: #f4f6f8;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111315;
        --text: #f2f2f2;
        --muted: #c3c7cb;
        --link: #8ab4f8;
        --rule: #4a4f55;
        --panel: #1b1f23;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      padding: 1.25rem;
      max-width: 72ch;
      background: var(--bg);
      color: var(--text);
      font: 1rem/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    h1, h2 { line-height: 1.25; }
    h1 { font-size: 1.8rem; margin-block: 0.5rem 1rem; }
    h2 { font-size: 1.3rem; margin-block-start: 2rem; }
    p, li { max-width: 70ch; }
    code { overflow-wrap: anywhere; }
    a { color: var(--link); text-underline-offset: 0.15em; }
    a:focus-visible { outline: 3px solid var(--link); outline-offset: 3px; }
    .skip {
      position: absolute;
      left: -9999px;
      top: 0;
      background: var(--panel);
      color: var(--text);
      padding: 0.75rem 1rem;
    }
    .skip:focus { left: 1rem; top: 1rem; z-index: 1; }
    .meta { color: var(--muted); }
    .panel { background: var(--panel); border-left: 4px solid var(--rule); padding: 0.75rem 1rem; }
    .hash { font-size: 0.9rem; }
    ul { padding-inline-start: 1.4rem; }
    footer { margin-block-start: 2.5rem; border-top: 1px solid var(--rule); padding-block-start: 1rem; }
    @media (prefers-reduced-motion: reduce) {
      * { scroll-behavior: auto !important; }
    }
  </style>
</head>
<body>
  <a class="skip" href="#main">Skip to main content</a>
  <header>
    <h1>WCAG by Role MCP server</h1>
    <p class="meta">Read-only Model Context Protocol access to WCAG 2.2 and W3C ARRM task data.</p>
  </header>
  <main id="main">
    <section aria-labelledby="about">
      <h2 id="about">What this server is</h2>
      <p>This endpoint exposes the published WCAG by Role dataset to MCP clients. It returns
      W3C WCAG 2.2 criterion references and ARRM task wording and ownership. It does not
      diagnose accessibility problems, determine conformance, or assign responsibility beyond
      the recorded ARRM task ownership.</p>
      <p class="panel">The project is independent. It is not an official W3C publication and is
      not endorsed by W3C. ARRM task ownership is advisory; a task that is missing or filtered
      away does not remove a WCAG obligation.</p>
    </section>

    <section aria-labelledby="connect">
      <h2 id="connect">Connect</h2>
      <p>MCP endpoint (Streamable HTTP, POST): <code>${escapeHtml(endpoint)}</code></p>
      <p>Point an MCP client that supports remote Streamable HTTP servers at that URL. The
      endpoint accepts anonymous, read-only requests and applies request-size and rate limits.
      Opening the endpoint in a browser does not start an MCP session.</p>
    </section>

    <section aria-labelledby="tools">
      <h2 id="tools">Tools</h2>
      <ul>
          ${toolItems}
      </ul>
    </section>

    <section aria-labelledby="data">
      <h2 id="data">Dataset and provenance</h2>
      <dl>
        <dt>Source snapshot</dt><dd>${escapeHtml(META.dataset.revision)}</dd>
        <dt>Counts</dt><dd>${counts.criteria} WCAG criteria, ${counts.tasks} ARRM tasks, ${counts.roles} roles</dd>
        <dt>Dataset SHA-256</dt><dd><code class="hash">${escapeHtml(META.dataset.sha256)}</code></dd>
        <dt>Citation</dt><dd>${escapeHtml(META.citation)}</dd>
      </dl>
      <p>Every tool result includes this revision, the source hashes and attribution. Read the
      <a href="${escapeHtml(META.datasetLandingUrl)}">published dataset</a>,
      <a href="${escapeHtml(META.manifestUrl)}">dataset manifest</a>, or
      <a href="${escapeHtml(META.canonicalDataUrl)}">normalized JSON</a>.</p>
    </section>

    <section aria-labelledby="limits">
      <h2 id="limits">Limits and privacy</h2>
      <p>Requests are bounded to 64 KiB. Tool results are bounded to 96 KiB and search returns
      at most 50 records per page. The server is stateless: it stores no per-user data and makes
      no runtime network requests. Rate limiting is approximate and applies per Cloudflare
      location.</p>
      <p>No reviewed per-criterion role guidance is published. The
      <code>get_role_guidance</code> tool reports that explicitly and returns original ARRM task
      data instead of generated advice.</p>
    </section>
  </main>
  <footer>
    <p>Source code and documentation:
    <a href="${escapeHtml(META.projectUrl)}/tree/main/cloudflare-mcp">cloudflare-mcp</a>.
    WCAG 2.2 and ARRM material remains subject to its publishers' terms.</p>
  </footer>
</body>
</html>
`;
}

function mcpHelpPage(requestUrl: string): string {
  const endpoint = new URL(MCP_PATH, requestUrl).toString();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>WCAG by Role MCP endpoint</title>
  <style>
    :root { color-scheme: light dark; --bg: #fff; --text: #1b1b1b; --link: #0b57d0; --muted: #4a4a4a; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #111315; --text: #f2f2f2; --link: #8ab4f8; --muted: #c3c7cb; }
    }
    * { box-sizing: border-box; }
    body { margin: 0 auto; padding: 1.25rem; max-width: 68ch; background: var(--bg); color: var(--text); font: 1rem/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
    a { color: var(--link); text-underline-offset: 0.15em; }
    a:focus-visible { outline: 3px solid var(--link); outline-offset: 3px; }
    code { overflow-wrap: anywhere; }
    .skip { position: absolute; left: -9999px; top: 0; }
    .skip:focus { left: 1rem; top: 1rem; }
    pre { background: #f4f6f8; color: #1b1b1b; padding: 0.75rem; overflow-x: auto; }
    @media (prefers-color-scheme: dark) { pre { background: #1b1f23; color: #f2f2f2; } }
    .meta { color: var(--muted); }
  </style>
</head>
<body>
  <a class="skip" href="#main">Skip to main content</a>
  <main id="main">
    <h1>This is the MCP endpoint</h1>
    <p><code>${escapeHtml(endpoint)}</code> is a Model Context Protocol endpoint. It accepts
    <code>POST</code> requests from an MCP client. A normal browser visit uses <code>GET</code>,
    so the server returns <strong>405 Method Not Allowed</strong>. That is expected.</p>
    <p class="meta">The server is running. To use it, point an MCP client at this URL.</p>
    <h2>Read the server overview</h2>
    <p><a href="/">Open the WCAG by Role MCP server page</a> for the tool list, dataset revision
    and connection instructions.</p>
    <h2>Quick check from a terminal</h2>
    <pre tabindex="0"><code>curl -sS ${escapeHtml(endpoint)} \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'</code></pre>
    <p>This endpoint is read-only and anonymous. It does not provide a browser interface.</p>
  </main>
</body>
</html>
`;
}

function mcpHelpResponse(request: Request): Response {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Language': 'en',
    'Allow': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
  return withSecurityHeaders(new Response(request.method === 'HEAD' ? null : mcpHelpPage(request.url), {
    status: 405,
    headers,
  }));
}

function htmlResponse(request: Request): Response {
  const body = request.method === 'HEAD' ? null : landingPage(request.url);
  return withSecurityHeaders(new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Language': 'en',
      'Cache-Control': 'public, max-age=300',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  }));
}

function healthResponse(): Response {
  return jsonResponse({
    status: 'ok',
    server: META.server,
    dataset: {
      revision: META.dataset.revision,
      sha256: META.dataset.sha256,
      counts: META.dataset.counts,
      mode: META.dataset.mode,
    },
    tools: TOOL_NAMES,
  }, 200);
}

async function readCappedBody(request: Request): Promise<
  { ok: true; text: string } | { ok: false; reason: 'too-large' | 'unreadable' }
> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: '' };
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, reason: 'too-large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

async function handleMcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const accept = request.headers.get('accept') ?? '';
    if (accept.includes('text/html')) return mcpHelpResponse(request);
  }

  if (request.method !== 'POST') {
    return withSecurityHeaders(await handlerFor(env)(request, env, ctx), {
      'Cache-Control': 'no-store',
    });
  }

  if (env.MCP_RATE_LIMITER) {
    const key = request.headers.get('cf-connecting-ip')?.trim() || 'anonymous';
    try {
      const { success } = await env.MCP_RATE_LIMITER.limit({ key });
      if (!success) {
        return provenanceError(
          'RATE_LIMITED',
          'Too many MCP requests from this client. Retry after 60 seconds.',
          429,
          { 'Retry-After': '60' },
        );
      }
    } catch (error) {
      console.error('Rate limiter unavailable', error);
      return provenanceError(
        'RATE_LIMIT_UNAVAILABLE',
        'The rate limiter is temporarily unavailable. Retry shortly.',
        503,
        { 'Retry-After': '10' },
      );
    }
  }

  const body = await readCappedBody(request);
  if (!body.ok) {
    if (body.reason === 'too-large') {
      return provenanceError(
        'REQUEST_TOO_LARGE',
        `MCP request bodies are limited to ${MAX_BODY_BYTES / 1024} KiB.`,
        413,
      );
    }
    return provenanceError('INVALID_REQUEST', 'The request body could not be read.', 400);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body.text);
  } catch {
    return provenanceError(
      'INVALID_JSON',
      'The request body is not valid JSON. Send one JSON-RPC message per POST request.',
      400,
    );
  }

  try {
    const response = await handlerFor(env).fetch(request, { parsedBody });
    return withSecurityHeaders(response, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('MCP handler failure', error);
    return provenanceError(
      'INTERNAL',
      'The MCP handler failed unexpectedly. No data was changed; retry or report the problem.',
      500,
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return provenanceError('METHOD_NOT_ALLOWED', 'Use GET or HEAD for this page.', 405, {
          Allow: 'GET, HEAD',
        });
      }
      return htmlResponse(request);
    }

    if (url.pathname === '/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return provenanceError('METHOD_NOT_ALLOWED', 'Use GET or HEAD for health.', 405, {
          Allow: 'GET, HEAD',
        });
      }
      return healthResponse();
    }

    if (url.pathname === MCP_PATH) {
      return handleMcp(request, env, ctx);
    }

    return provenanceError(
      'NOT_FOUND',
      `No route for ${url.pathname}. The MCP endpoint is ${MCP_PATH} and the human-readable page is /.`,
      404,
    );
  },
} satisfies ExportedHandler<Env>;
