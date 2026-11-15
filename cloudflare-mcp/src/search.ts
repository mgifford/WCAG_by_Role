import {
  CRITERION_BY_NUMBER,
  DATASET,
  TASK_COUNT_BY_CRITERION,
  criterionUrl,
  taskUrl,
} from './dataset';
import { ToolError } from './errors';
import { encodeCursor, type SearchInput } from './validation';

interface SearchEntry {
  kind: 'criterion' | 'task';
  id: string;
  criterionNumber: string;
  title: string;
  nameLower: string;
  haystack: string;
  url: string;
  level?: string;
  stage?: string;
  snippetSource: string;
}

const ENTRIES: readonly SearchEntry[] = buildEntries();

function buildEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const criterion of DATASET.criteria) {
    const brief = criterion.inBrief ?? {};
    const fullText = [
      criterion.summary ?? '',
      brief.goal ?? '',
      brief.whatToDo ?? '',
      brief.authorTask ?? '',
      brief.whyImportant ?? '',
    ].filter(Boolean).join(' ');
    const title = `${criterion.number} ${criterion.name}`;
    entries.push({
      kind: 'criterion',
      id: criterion.number,
      criterionNumber: criterion.number,
      title,
      nameLower: criterion.name.toLowerCase(),
      haystack: [
        title,
        criterion.slug,
        criterion.principle ?? '',
        criterion.guideline ?? '',
        fullText,
      ].join(' ').toLowerCase(),
      url: criterionUrl(criterion),
      level: criterion.level,
      snippetSource: fullText,
    });
  }

  for (const task of DATASET.tasks) {
    const criterion = CRITERION_BY_NUMBER.get(task.criterion);
    entries.push({
      kind: 'task',
      id: task.id,
      criterionNumber: task.criterion,
      title: `${task.id} ${task.text}`,
      nameLower: task.id.toLowerCase(),
      haystack: [task.id, task.text, task.stage ?? '', criterion?.name ?? ''].join(' ').toLowerCase(),
      url: taskUrl(task),
      stage: task.stage,
      snippetSource: task.text,
    });
  }

  return entries;
}

function scoreEntry(entry: SearchEntry, query: string, tokens: readonly string[]): number {
  const id = entry.id.toLowerCase();
  if (id === query) return 1000;
  if (entry.title.toLowerCase() === query) return 950;
  if (id.startsWith(query)) return 800;
  if (entry.nameLower.includes(query)) return 700;
  if (entry.title.toLowerCase().includes(query)) return 650;
  if (!tokens.every((token) => entry.haystack.includes(token))) return 0;
  return 100 + tokens.filter((token) => entry.nameLower.includes(token)).length * 10;
}

function compareMatches(
  a: { entry: SearchEntry; score: number },
  b: { entry: SearchEntry; score: number },
): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.entry.kind !== b.entry.kind) return a.entry.kind === 'criterion' ? -1 : 1;
  return a.entry.id.localeCompare(b.entry.id, 'en', { numeric: true, sensitivity: 'base' });
}

function truncateSnippet(source: string, query: string, max = 220): { text: string; truncated: boolean } {
  const clean = source.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  const match = clean.toLowerCase().indexOf(query.toLowerCase());
  let start = 0;
  if (match > Math.floor(max / 3)) {
    start = Math.max(0, match - 60);
    const space = clean.indexOf(' ', start);
    if (space !== -1 && space < match) start = space + 1;
  }
  let end = Math.min(clean.length, start + max);
  if (end < clean.length) {
    const space = clean.lastIndexOf(' ', end);
    if (space > start) end = space;
  }
  const text = `${start > 0 ? '…' : ''}${clean.slice(start, end).trim()}${end < clean.length ? '…' : ''}`;
  return { text, truncated: true };
}

export interface SearchResult {
  query: string;
  limit: number;
  returned: number;
  total: number;
  nextCursor: string | null;
  results: Array<Record<string, unknown>>;
  nextStep: string;
}

export function searchAccessibility(input: SearchInput): SearchResult {
  const query = input.query.toLowerCase();
  const tokens = query.split(' ').filter(Boolean);

  const matches = ENTRIES
    .map((entry) => ({ entry, score: scoreEntry(entry, query, tokens) }))
    .filter((match) => match.score > 0)
    .sort(compareMatches);

  const total = matches.length;
  if (input.offset > total) {
    throw new ToolError(
      'INVALID_CURSOR',
      'cursor points beyond the current result set.',
      'Start a new search without a cursor; the dataset may have been rebuilt since the cursor was issued.',
    );
  }

  const page = matches.slice(input.offset, input.offset + input.limit);
  const nextOffset = input.offset + page.length;
  const nextCursor = nextOffset < total ? encodeCursor(nextOffset) : null;

  const results = page.map(({ entry }) => {
    const snippet = truncateSnippet(entry.snippetSource, input.query);
    if (entry.kind === 'criterion') {
      return {
        recordType: 'wcag-criterion',
        number: entry.id,
        name: entry.title.slice(entry.id.length + 1),
        level: entry.level,
        snippet: snippet.text,
        truncated: snippet.truncated,
        recordedTaskCount: TASK_COUNT_BY_CRITERION.get(entry.criterionNumber) ?? 0,
        url: entry.url,
      };
    }
    const criterion = CRITERION_BY_NUMBER.get(entry.criterionNumber);
    return {
      recordType: 'arrm-task',
      taskId: entry.id,
      criterionNumber: entry.criterionNumber,
      criterionName: criterion?.name ?? null,
      stage: entry.stage ?? null,
      snippet: snippet.text,
      truncated: snippet.truncated,
      url: entry.url,
    };
  });

  return {
    query: input.query,
    limit: input.limit,
    returned: results.length,
    total,
    nextCursor,
    results,
    nextStep: results.length === 0
      ? 'No match. Try a WCAG criterion number, an ARRM task ID, or a shorter phrase.'
      : 'Use get_criterion or get_arrm_task for complete source wording; search snippets are truncated only.',
  };
}
