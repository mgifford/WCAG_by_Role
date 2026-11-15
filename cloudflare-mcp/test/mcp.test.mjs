/**
 * Protocol-level integration tests for the WCAG by Role MCP server.
 *
 * These tests start a real `wrangler dev` process, connect with the official
 * MCP SDK client over Streamable HTTP in both the current (2026-07-28) and
 * legacy (2025-11-25) eras, and call every tool. They also check error
 * handling, provenance, request bounds and rate limiting.
 *
 * Run with: pnpm test
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import process from 'node:process';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.MCP_TEST_PORT ?? 8791);
const BASE = `http://127.0.0.1:${PORT}`;
const TOOL_NAMES = [
  'get_dataset_info',
  'search_accessibility',
  'get_criterion',
  'get_arrm_task',
  'get_role_guidance',
  'compare_roles',
];

const server = {
  child: undefined,
  output: '',
  ready: false,
};

function appendOutput(chunk) {
  server.output = (server.output + chunk).slice(-20_000);
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.child?.exitCode !== null) {
      throw new Error(`wrangler dev exited before becoming ready:\n${server.output}`);
    }
    try {
      const response = await fetch(`${BASE}/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${BASE}/health:\n${server.output}`);
}

before(async () => {
  const wrangler = path.join(
    ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
  );
  server.child = spawn(wrangler, ['dev', '--port', String(PORT), '--ip', '127.0.0.1'], {
    cwd: ROOT,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      CI: '1',
      NO_COLOR: '1',
      WRANGLER_SEND_METRICS: 'false',
      // Wrangler writes logs under ~/Library/Preferences on macOS. Keep them
      // inside the workspace so sandboxed and CI runs work.
      XDG_CONFIG_HOME: path.join(ROOT, '.wrangler-config'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.child.stdout.setEncoding('utf8');
  server.child.stderr.setEncoding('utf8');
  server.child.stdout.on('data', appendOutput);
  server.child.stderr.on('data', appendOutput);
  await waitForHealth();
  server.ready = true;
});

after(async () => {
  if (client) await client.close().catch(() => {});
  const child = server.child;
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, 'SIGTERM');
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    child.kill('SIGTERM');
  }
  const timeout = new Promise((resolve) => setTimeout(resolve, 10_000));
  await Promise.race([once(child, 'exit'), timeout]);
  if (child.exitCode === null) {
    try {
      if (process.platform !== 'win32' && child.pid) {
        process.kill(-child.pid, 'SIGKILL');
      } else {
        child.kill('SIGKILL');
      }
    } catch {
      // Already gone.
    }
  }
});

async function connect({ modern = false } = {}) {
  const options = modern
    ? { versionNegotiation: { mode: { pin: '2026-07-28' } } }
    : undefined;
  const client = new Client({ name: 'wcag-by-role-mcp-test', version: '1.0.0' }, options);
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`));
  await client.connect(transport);
  return client;
}

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.find((item) => item.type === 'text')?.text;
  assert.equal(typeof text, 'string', `${name} returned no text content`);
  return { isError: result.isError === true, data: JSON.parse(text) };
}

function assertProvenance(data, label) {
  assert.ok(data.provenance, `${label}: missing provenance`);
  assert.equal(data.provenance.dataset.mode, 'production', `${label}: not production data`);
  assert.match(data.provenance.dataset.revision, /^\d{4}-\d{2}-\d{2}T/, `${label}: bad revision`);
  assert.match(data.provenance.dataset.sha256, /^[0-9a-f]{64}$/, `${label}: bad dataset hash`);
  assert.equal(data.provenance.attribution.w3cEndorsed, false, `${label}: W3C endorsement`);
  assert.match(data.provenance.sources.wcag, /^https:\/\//);
}

let client;

test('serves an accessible landing page and operational health endpoint', async () => {
  const page = await fetch(`${BASE}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type') ?? '', /^text\/html; charset=utf-8/);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.match(page.headers.get('content-security-policy') ?? '', /default-src 'none'/);
  const html = await page.text();
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>WCAG by Role MCP server<\/title>/);
  assert.match(html, /<h1>WCAG by Role MCP server<\/h1>/);
  assert.match(html, /href="#main"/);
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, 'exactly one h1');
  assert.doesNotMatch(html, /<script/i);
  assert.match(html, /not endorsed by W3C/);

  const health = await fetch(`${BASE}/health`);
  assert.equal(health.status, 200);
  const body = await health.json();
  assert.equal(body.status, 'ok');
  assert.deepEqual(body.tools, TOOL_NAMES);
  assert.equal(body.dataset.counts.criteria, 86);
  assert.equal(body.dataset.counts.tasks, 262);
  assert.equal(body.dataset.mode, 'production');
});

test('lists exactly the contracted read-only tools with strict schemas', async () => {
  client = await connect();
  assert.equal(client.getProtocolEra(), 'legacy');
  assert.equal(client.getNegotiatedProtocolVersion(), '2025-11-25');
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name), TOOL_NAMES);
  for (const tool of tools) {
    assert.ok(tool.description.length > 40, `${tool.name} needs a useful description`);
    assert.equal(tool.inputSchema.type, 'object', `${tool.name} schema type`);
    assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name} must reject unknown keys`);
    assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} must be read-only`);
  }
});

test('supports the current 2026-07-28 stateless protocol era', async () => {
  const modern = await connect({ modern: true });
  try {
    assert.equal(modern.getProtocolEra(), 'modern');
    assert.equal(modern.getNegotiatedProtocolVersion(), '2026-07-28');
    const { tools } = await modern.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), TOOL_NAMES);
    const { isError, data } = await call(modern, 'get_dataset_info');
    assert.equal(isError, false);
    assertProvenance(data, 'modern get_dataset_info');
  } finally {
    await modern.close();
  }
});

test('get_dataset_info reports revision, hashes, citation and distributions', async () => {
  const { isError, data } = await call(client, 'get_dataset_info');
  assert.equal(isError, false);
  assertProvenance(data, 'get_dataset_info');
  assert.equal(data.dataset.mode, 'production');
  assert.equal(data.dataset.counts.criteria, 86);
  assert.equal(data.dataset.counts.tasks, 262);
  assert.equal(data.dataset.counts.roles, 5);
  assert.match(data.dataset.sha256, /^[0-9a-f]{64}$/);
  assert.match(data.citation, /Source snapshot \d{4}-\d{2}-\d{2}/);
  assert.ok(data.distributions.length >= 6);
  for (const distribution of data.distributions) {
    assert.match(distribution.url, /^https:\/\/mgifford\.github\.io\/WCAG_by_Role\//);
    assert.match(distribution.encodingFormat, /^(application|text)\//);
  }
  assert.equal(data.policies.readOnly, true);
  assert.equal(data.policies.noConformanceDetermination, true);
  assert.equal(data.policies.reviewedRoleGuidanceAvailable, false);
});

test('search is bounded, paginates without duplicates and preserves source text', async () => {
  const first = await call(client, 'search_accessibility', { query: 'focus', limit: 5 });
  assert.equal(first.isError, false);
  assertProvenance(first.data, 'search page 1');
  assert.equal(first.data.returned, 5);
  assert.ok(first.data.total > 5);
  assert.equal(typeof first.data.nextCursor, 'string');

  const seen = new Set();
  const collect = (results) => {
    for (const result of results) {
      const key = result.taskId ?? result.number;
      assert.equal(seen.has(key), false, `duplicate search result ${key}`);
      seen.add(key);
      assert.ok(result.snippet.length > 0);
      assert.ok(result.snippet.length <= 240, 'snippet must stay within its bound');
      if (!result.truncated) {
        assert.ok(result.snippet.length <= 220);
      }
    }
  };
  collect(first.data.results);

  let page = first.data;
  let pages = 1;
  while (page.nextCursor) {
    assert.ok(pages < 50, 'pagination did not terminate');
    const next = await call(client, 'search_accessibility', {
      query: 'focus',
      limit: 5,
      cursor: page.nextCursor,
    });
    assert.equal(next.isError, false);
    collect(next.data.results);
    page = next.data;
    pages += 1;
  }
  assert.equal(seen.size, first.data.total, 'pagination must return every match exactly once');
  assert.equal(page.nextCursor, null);

  const exactTask = await call(client, 'search_accessibility', { query: 'INP-017', limit: 3 });
  assert.equal(exactTask.data.results[0].taskId, 'INP-017');
  const exactCriterion = await call(client, 'search_accessibility', { query: '2.4.7', limit: 3 });
  assert.equal(exactCriterion.data.results[0].number, '2.4.7');
});

test('get_criterion returns W3C links, separated ARRM summary and task ownership', async () => {
  const { isError, data } = await call(client, 'get_criterion', { criterion: '2.4.7' });
  assert.equal(isError, false);
  assertProvenance(data, 'get_criterion');
  assert.equal(data.criterion.number, '2.4.7');
  assert.equal(data.criterion.name, 'Focus Visible');
  assert.equal(data.criterion.level, 'AA');
  assert.equal(data.criterion.normativeUrl, 'https://www.w3.org/TR/WCAG22/#focus-visible');
  assert.match(data.criterion.understandingUrl, /^https:\/\/www\.w3\.org\/WAI\/WCAG22\/Understanding\//);
  assert.ok(data.criterionLevelSummary);
  assert.ok(data.relatedTasks.some((task) => task.taskId === 'INP-017'));
  const task = data.relatedTasks.find((item) => item.taskId === 'INP-017');
  assert.equal(task.ownership.primary.includes('Visual Design'), true);
  assert.equal(task.ownership.secondary.includes('User Experience (UX) Design'), true);
  assert.match(task.text, /keyboard focus/);
  assert.ok(data.notices.some((notice) => /not task-level ownership/.test(notice)));

  const missing = await call(client, 'get_criterion', { criterion: '3.3.7' });
  assert.equal(missing.isError, false);
  assert.equal(missing.data.criterion.summaryStatus, 'missing');
  assert.ok(missing.data.notices.some((notice) => /no criterion-level summary/i.test(notice)));
});

test('get_arrm_task returns verbatim wording and every recorded level', async () => {
  const dataset = JSON.parse(await readFile(path.join(ROOT, 'src', 'generated', 'dataset.json'), 'utf8'));
  const expected = dataset.tasks.find((task) => task.id === 'NAV-013');
  assert.ok(expected, 'NAV-013 must exist in the generated dataset');
  const { isError, data } = await call(client, 'get_arrm_task', { task_id: 'nav-013' });
  assert.equal(isError, false);
  assertProvenance(data, 'get_arrm_task');
  assert.equal(data.task.taskId, 'NAV-013');
  assert.equal(data.task.text, expected.text);
  assert.deepEqual(data.task.ownership, expected.ownership);
  const ux = data.task.roleLevels.find((role) => role.name === 'User Experience (UX) Design');
  assert.deepEqual(ux.levels.sort(), ['contributor', 'secondary']);
  assert.equal(data.criterion.number, expected.criterion);
});

test('get_role_guidance reports missing review honestly and never fabricates', async () => {
  const unassigned = await call(client, 'get_role_guidance', {
    role: 'visual-design',
    task_id: 'IMG-001',
  });
  assert.equal(unassigned.isError, false);
  assertProvenance(unassigned.data, 'get_role_guidance task');
  assert.equal(unassigned.data.guidanceStatus, 'missing-reviewed-interpretation');
  assert.equal(unassigned.data.reviewStatus, 'not-reviewed');
  assert.deepEqual(unassigned.data.interpretationRecords, []);
  assert.equal(unassigned.data.roleAssignment.recorded, false);
  assert.ok(unassigned.data.notices.some((notice) => /not an exemption/.test(notice)));

  const assigned = await call(client, 'get_role_guidance', {
    role: 'visual-design',
    criterion: '2.4.7',
  });
  assert.equal(assigned.isError, false);
  assert.ok(assigned.data.recordedTaskCount > 0);
  assert.ok(assigned.data.tasks.every((task) => task.recordType === 'arrm-task'));
  assert.equal(assigned.data.guidanceStatus, 'missing-reviewed-interpretation');

  const overview = await call(client, 'get_role_guidance', { role: 'business-analysis' });
  assert.equal(overview.isError, false);
  assert.ok(overview.data.recordedTaskCount > 0);
  assert.ok(overview.data.criteriaWithRecordedTaskCount > 0);
  assert.equal(overview.data.criteriaTotal, 86);
  assert.equal(
    overview.data.criteriaWithRecordedTaskCount + overview.data.criteriaWithNoRecordedTaskCount,
    overview.data.criteriaTotal,
  );
  assert.equal(overview.data.tasksTotal, 262);
  assert.equal(overview.data.interpretationRecords.length, 0);
});

test('compare_roles returns recorded assignments and labels gaps as not recorded', async () => {
  const byCriterion = await call(client, 'compare_roles', { criterion: '1.1.1' });
  assert.equal(byCriterion.isError, false);
  assertProvenance(byCriterion.data, 'compare_roles criterion');
  assert.equal(byCriterion.data.mode, 'criterion');
  assert.equal(byCriterion.data.taskAssignments.length, byCriterion.data.taskCount);
  const assignedNames = new Set();
  for (const record of byCriterion.data.roleMatrix) {
    const ids = new Set(Object.values(record.taskIds).flat());
    assert.equal(ids.size, record.recordedTaskCount);
    for (const id of ids) assignedNames.add(id);
  }
  assert.equal(assignedNames.size, byCriterion.data.taskCount);
  const noTask = new Set(byCriterion.data.rolesWithNoRecordedTask.map((role) => role.name));
  const rolesSeen = new Set([
    ...byCriterion.data.roleMatrix.filter((record) => record.recordedTaskCount > 0).map((record) => record.roleName),
    ...noTask,
  ]);
  assert.equal(rolesSeen.size, 5, 'every canonical role must be accounted for');

  const byTask = await call(client, 'compare_roles', { task_id: 'IMG-001' });
  assert.equal(byTask.isError, false);
  assert.equal(byTask.data.mode, 'task');
  assert.deepEqual(byTask.data.assignedRoles.primary, ['Content Authoring']);
  const unassigned = byTask.data.unassignedRoles.map((role) => role.name);
  assert.ok(unassigned.includes('Visual Design'));
  assert.ok(unassigned.includes('Front-End Development'));
  assert.equal(byTask.data.assignedRoles.primary.includes('Visual Design'), false);
});

test('rejects unknown ids, unknown roles, ambiguous arguments and bad cursors', async () => {
  const cases = [
    ['get_criterion', { criterion: '9.9.9' }, 'UNKNOWN_CRITERION'],
    ['get_criterion', { criterion: '2.4' }, 'INVALID_ARGUMENT'],
    ['get_arrm_task', { task_id: 'NOPE-999' }, 'UNKNOWN_TASK'],
    ['get_role_guidance', { role: 'frontend' }, 'UNKNOWN_ROLE'],
    ['search_accessibility', { query: 'focus', limit: 51 }, 'INVALID_ARGUMENT'],
    ['search_accessibility', { query: 'x' }, 'INVALID_ARGUMENT'],
    ['search_accessibility', { query: 'focus', cursor: 'not-a-cursor' }, 'INVALID_CURSOR'],
    ['compare_roles', {}, 'INVALID_ARGUMENT'],
    ['compare_roles', { criterion: '1.1.1', task_id: 'IMG-001' }, 'INVALID_ARGUMENT'],
  ];
  for (const [name, args, code] of cases) {
    const { isError, data } = await call(client, name, args);
    assert.equal(isError, true, `${name} ${JSON.stringify(args)} should fail`);
    assert.equal(data.error.code, code, `${name} ${JSON.stringify(args)} error code`);
    assertProvenance(data, `${name} error`);
  }

  const unknownKey = await client.callTool({
    name: 'get_criterion',
    arguments: { criterion: '2.4.7', extra: true },
  });
  assert.equal(unknownKey.isError, true, 'strict schema must reject unknown keys');
});

test('enforces HTTP method, route, body-size and rate limits', async () => {
  const get = await fetch(`${BASE}/mcp`);
  assert.equal(get.status, 405);

  const browserGet = await fetch(`${BASE}/mcp`, { headers: { Accept: 'text/html' } });
  assert.equal(browserGet.status, 405);
  assert.equal(browserGet.headers.get('allow'), 'POST, OPTIONS');
  assert.match(browserGet.headers.get('content-type') ?? '', /^text\/html/);
  const help = await browserGet.text();
  assert.match(help, /This is the MCP endpoint/);
  assert.match(help, /405 Method Not Allowed/);
  assert.match(help, /href="\/"/);
  assert.doesNotMatch(help, /<script/i);
  const notFound = await fetch(`${BASE}/nope`);
  assert.equal(notFound.status, 404);
  const notFoundBody = await notFound.json();
  assert.equal(notFoundBody.error.code, 'NOT_FOUND');

  const preflight = await fetch(`${BASE}/mcp`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type, mcp-protocol-version',
    },
  });
  assert.ok([200, 204].includes(preflight.status), 'localhost preflight must succeed');
  assert.match(preflight.headers.get('access-control-allow-origin') ?? '', /\*/);
  assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /POST/);

  const blockedOrigin = await fetch(`${BASE}/mcp`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(blockedOrigin.status, 403, 'unknown browser Origin must be rejected');

  const big = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: { pad: 'x'.repeat(70_000) },
  });
  const oversized = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: big,
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'REQUEST_TOO_LARGE');

  let limited = false;
  for (let i = 0; i < 140; i += 1) {
    const response = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: '{}',
    });
    if (response.status === 429) {
      limited = true;
      assert.equal(response.headers.get('retry-after'), '60');
      const body = await response.json();
      assert.equal(body.error.code, 'RATE_LIMITED');
      assertProvenance(body, 'rate limit');
      break;
    }
  }
  assert.equal(limited, true, 'rate limiting never produced a 429');
});
