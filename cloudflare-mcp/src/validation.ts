import {
  CRITERION_BY_NUMBER,
  ROLE_BY_NAME,
  ROLE_BY_SLUG,
  ROLES,
  TASK_BY_ID,
} from './dataset';
import { ToolError } from './errors';
import type { Criterion, RoleRecord, Task } from './types';

export const MIN_QUERY_CHARS = 2;
export const MAX_QUERY_CHARS = 200;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 10;
export const MAX_CURSOR_CHARS = 64;
export const MAX_CURSOR_OFFSET = 100_000;

const CRITERION_RE = /^\d+\.\d+\.\d+$/;
const TASK_RE = /^[A-Z]{2,6}-\d{3}$/;
const CURSOR_RE = /^v1:(\d{1,6})$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ToolError('INVALID_ARGUMENT', `${field} must be a string.`);
  }
  return value;
}

export function readCriterionNumber(value: unknown): string {
  const raw = asString(value, 'criterion').trim();
  if (!CRITERION_RE.test(raw)) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      'criterion must use the WCAG number form, for example 2.4.7.',
      'Use the exact criterion number; do not pass a name or partial number.',
    );
  }
  if (!CRITERION_BY_NUMBER.has(raw)) {
    throw new ToolError(
      'UNKNOWN_CRITERION',
      `No WCAG 2.2 criterion ${raw} is present in this dataset.`,
      'Search by name with search_accessibility, then call get_criterion with the returned number.',
    );
  }
  return raw;
}

export function lookupCriterion(value: unknown): Criterion {
  const number = readCriterionNumber(value);
  const criterion = CRITERION_BY_NUMBER.get(number);
  if (!criterion) {
    // readCriterionNumber already checked this; keeps TypeScript honest.
    throw new ToolError('UNKNOWN_CRITERION', `No WCAG 2.2 criterion ${number} is present.`);
  }
  return criterion;
}

export function readTaskId(value: unknown): string {
  const raw = asString(value, 'task_id').trim().toUpperCase();
  if (!TASK_RE.test(raw)) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      'task_id must use the ARRM task-id form, for example INP-017.',
      'Use the exact task ID returned by search_accessibility.',
    );
  }
  if (!TASK_BY_ID.has(raw)) {
    throw new ToolError(
      'UNKNOWN_TASK',
      `No ARRM task ${raw} is present in this dataset.`,
      'Call search_accessibility to find a task ID. Do not guess or construct ARRM task IDs.',
    );
  }
  return raw;
}

export function lookupTask(value: unknown): Task {
  const id = readTaskId(value);
  const task = TASK_BY_ID.get(id);
  if (!task) {
    throw new ToolError('UNKNOWN_TASK', `No ARRM task ${id} is present.`);
  }
  return task;
}

export function readRole(value: unknown): RoleRecord {
  const raw = asString(value, 'role').trim();
  if (raw.length === 0 || raw.length > 80) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      'role must be a canonical role slug or the exact ARRM role name.',
      roleHint(),
    );
  }
  const bySlug = ROLE_BY_SLUG.get(raw.toLowerCase());
  if (bySlug) return bySlug;
  const byName = ROLE_BY_NAME.get(raw.toLowerCase());
  if (byName) return byName;
  throw new ToolError(
    'UNKNOWN_ROLE',
    `Unknown role ${JSON.stringify(raw)}.`,
    roleHint(),
  );
}

function roleHint(): string {
  return `Use one of: ${ROLES.map((role) => `${role.slug} (${role.name})`).join(', ')}.`;
}

export interface SearchInput {
  query: string;
  limit: number;
  offset: number;
}

export function readSearchInput(args: {
  query?: unknown;
  limit?: unknown;
  cursor?: unknown;
}): SearchInput {
  const query = asString(args.query, 'query')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (query.length < MIN_QUERY_CHARS) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      `query must contain at least ${MIN_QUERY_CHARS} visible characters.`,
      'Try a criterion number, task ID, role-adjacent term, or short phrase.',
    );
  }
  if (query.length > MAX_QUERY_CHARS) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      `query must be at most ${MAX_QUERY_CHARS} characters.`,
      'Shorten the query; search matches every whitespace-separated term.',
    );
  }

  let limit = DEFAULT_LIMIT;
  if (args.limit !== undefined) {
    if (typeof args.limit !== 'number' || !Number.isInteger(args.limit)) {
      throw new ToolError('INVALID_ARGUMENT', 'limit must be an integer.');
    }
    if (args.limit < MIN_LIMIT || args.limit > MAX_LIMIT) {
      throw new ToolError(
        'INVALID_ARGUMENT',
        `limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}.`,
      );
    }
    limit = args.limit;
  }

  let offset = 0;
  if (args.cursor !== undefined) {
    offset = decodeCursor(args.cursor);
  }

  return { query, limit, offset };
}

export function encodeCursor(offset: number): string {
  return btoa(`v1:${offset}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCursor(value: unknown): number {
  if (typeof value !== 'string') {
    throw new ToolError('INVALID_ARGUMENT', 'cursor must be an opaque string from a previous result.');
  }
  const raw = value.trim();
  if (raw.length === 0) return 0;
  if (raw.length > MAX_CURSOR_CHARS || !BASE64URL_RE.test(raw)) {
    throw new ToolError('INVALID_CURSOR', 'cursor is malformed.');
  }
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (raw.length % 4)) % 4);
  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    throw new ToolError('INVALID_CURSOR', 'cursor is malformed.');
  }
  const match = CURSOR_RE.exec(decoded);
  if (!match) {
    throw new ToolError('INVALID_CURSOR', 'cursor is malformed.');
  }
  const offset = Number(match[1]);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_CURSOR_OFFSET) {
    throw new ToolError('INVALID_CURSOR', 'cursor offset is outside the supported range.');
  }
  return offset;
}

export function assertAtMostOne(
  criterion: string | undefined,
  taskId: string | undefined,
  toolName: string,
): void {
  if (criterion !== undefined && taskId !== undefined) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      `${toolName} accepts either criterion or task_id, not both.`,
      'Call the tool twice or compare one record at a time.',
    );
  }
}
