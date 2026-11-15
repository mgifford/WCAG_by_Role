import datasetJson from './generated/dataset.json';
import metaJson from './generated/meta.json';
import type { Criterion, Dataset, DatasetMeta, RoleRecord, Task } from './types';

/**
 * The dataset is baked in at build time from data/source/role-data.yaml.
 * There is no runtime fetch, no arbitrary URL input and no shared cache to
 * invalidate: a new source snapshot requires a new Worker deployment.
 */
export const DATASET = datasetJson as unknown as Dataset;
export const META = metaJson as unknown as DatasetMeta;

function assertDataset(): void {
  const problems: string[] = [];
  if (DATASET.mode !== 'production') {
    problems.push(`dataset mode is ${DATASET.mode}, expected production`);
  }
  if (DATASET.criteria.length !== META.dataset.counts.criteria) {
    problems.push('criteria count does not match meta.json');
  }
  if (DATASET.tasks.length !== META.dataset.counts.tasks) {
    problems.push('tasks count does not match meta.json');
  }
  if (DATASET.roles.length !== META.roles.length) {
    problems.push('role count does not match meta.json');
  }
  const roleNames = new Set(META.roles.map((role) => role.name));
  for (const role of DATASET.roles) {
    if (!roleNames.has(role)) problems.push(`unknown role ${role}`);
  }
  const criterionNumbers = new Set(DATASET.criteria.map((criterion) => criterion.number));
  if (criterionNumbers.size !== DATASET.criteria.length) {
    problems.push('duplicate criterion number');
  }
  const taskIds = new Set<string>();
  for (const task of DATASET.tasks) {
    if (taskIds.has(task.id)) problems.push(`duplicate task ${task.id}`);
    taskIds.add(task.id);
    if (!criterionNumbers.has(task.criterion)) {
      problems.push(`task ${task.id} refers to unknown criterion ${task.criterion}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Invalid generated MCP dataset: ${problems.join('; ')}. Run pnpm build:data.`);
  }
}

assertDataset();

export const ROLES: readonly RoleRecord[] = META.roles;

export const ROLE_BY_SLUG: ReadonlyMap<string, RoleRecord> = new Map(
  ROLES.map((role) => [role.slug, role]),
);

export const ROLE_BY_NAME: ReadonlyMap<string, RoleRecord> = new Map(
  ROLES.map((role) => [role.name.toLowerCase(), role]),
);

export const CRITERION_BY_NUMBER: ReadonlyMap<string, Criterion> = new Map(
  DATASET.criteria.map((criterion) => [criterion.number, criterion]),
);

export const CRITERION_BY_SLUG: ReadonlyMap<string, Criterion> = new Map(
  DATASET.criteria.map((criterion) => [criterion.slug, criterion]),
);

export const TASK_BY_ID: ReadonlyMap<string, Task> = new Map(
  DATASET.tasks.map((task) => [task.id, task]),
);

export const TASKS_BY_CRITERION: ReadonlyMap<string, readonly Task[]> = (() => {
  const grouped = new Map<string, Task[]>();
  for (const task of DATASET.tasks) {
    const bucket = grouped.get(task.criterion);
    if (bucket) bucket.push(task);
    else grouped.set(task.criterion, [task]);
  }
  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  }
  return grouped;
})();

export const TASK_COUNT_BY_CRITERION: ReadonlyMap<string, number> = new Map(
  [...TASKS_BY_CRITERION].map(([number, tasks]) => [number, tasks.length]),
);

export function siteUrl(path: string): string {
  return new URL(path, META.distributionBaseUrl).toString();
}

export function criterionUrl(criterion: Criterion): string {
  return siteUrl(`criteria/${criterion.number}-${criterion.slug}/`);
}

export function taskUrl(task: Task): string {
  return siteUrl(`tasks/${task.id}/`);
}

export function compareUrl(number: string): string {
  return siteUrl(`compare/${number}/`);
}

export function roleUrl(slug: string): string {
  return siteUrl(`roles/${slug}/`);
}

export const ARRM_TASKS_URL = 'https://www.w3.org/WAI/planning/arrm/tasks/';

/** Attached to every tool result so revision and attribution travel with data. */
export const PROVENANCE = {
  server: META.server,
  dataset: {
    revision: META.dataset.revision,
    sha256: META.dataset.sha256,
    schemaVersion: META.dataset.schemaVersion,
    wcagVersion: META.dataset.wcagVersion,
    mode: META.dataset.mode,
    counts: META.dataset.counts,
  },
  sources: META.dataset.sources,
  sourceSHA256: META.dataset.sourceSHA256,
  attribution: META.attribution,
} as const;
