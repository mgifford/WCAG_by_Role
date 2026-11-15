import { McpServer, type CallToolResult, type ToolAnnotations } from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
  ARRM_TASKS_URL,
  CRITERION_BY_NUMBER,
  DATASET,
  META,
  PROVENANCE,
  ROLES,
  TASKS_BY_CRITERION,
  compareUrl,
  criterionUrl,
  roleUrl,
  taskUrl,
} from './dataset';
import { ToolError } from './errors';
import { searchAccessibility } from './search';
import type { Criterion, OwnershipLevel, Task } from './types';
import {
  assertAtMostOne,
  lookupCriterion,
  lookupTask,
  readRole,
  readSearchInput,
} from './validation';

export const MAX_RESULT_BYTES = 96 * 1024;
const MAX_TASKS_PER_RECORD = 50;
const LEVELS: readonly OwnershipLevel[] = ['primary', 'secondary', 'contributor'];

const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const NO_INFERENCE_NOTE =
  'A role with no recorded assignment is "not recorded", not exempt. ARRM ownership is ' +
  'recorded at task level; absence from the data does not remove a WCAG obligation.';

const SUMMARY_NOTE =
  'The W3C ARRM criterion-level summary is informational. It is not task-level ownership ' +
  'and must not be used to infer who performs a task.';

function textResult(payload: Record<string, unknown>): CallToolResult {
  const text = JSON.stringify(payload, null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_RESULT_BYTES) {
    return errorResult(new ToolError(
      'RESULT_TOO_LARGE',
      `The result would exceed the ${Math.round(MAX_RESULT_BYTES / 1024)} KiB response limit.`,
      'Narrow the request: reduce limit, request one criterion or task, or paginate with cursor.',
    ));
  }
  return { content: [{ type: 'text', text }] };
}

function errorResult(error: ToolError): CallToolResult {
  const payload: Record<string, unknown> = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.hint ? { hint: error.hint } : {}),
    },
    provenance: PROVENANCE,
  };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function guarded<Args>(handler: (args: Args) => Record<string, unknown>) {
  return async (args: Args): Promise<CallToolResult> => {
    try {
      const payload = handler(args);
      return textResult({ ...payload, provenance: PROVENANCE });
    } catch (error) {
      if (error instanceof ToolError) return errorResult(error);
      console.error('Unhandled MCP tool error', error);
      return errorResult(new ToolError(
        'INTERNAL',
        'The tool failed unexpectedly. No data was changed; retry or report the problem.',
      ));
    }
  };
}

function criterionView(criterion: Criterion): Record<string, unknown> {
  return {
    recordType: 'wcag-criterion',
    number: criterion.number,
    slug: criterion.slug,
    name: criterion.name,
    level: criterion.level,
    principle: criterion.principle ?? null,
    guideline: criterion.guideline ?? null,
    wcagVersion: DATASET.wcagVersion,
    summary: criterion.summary ?? null,
    summaryStatus: criterion.criterionSummaryStatus,
    inBrief: criterion.inBrief ?? null,
    mapped: criterion.mapped,
    normativeUrl: criterion.normativeUrl,
    understandingUrl: criterion.understandingUrl,
    siteUrl: criterionUrl(criterion),
    recordedTaskCount: TASKS_BY_CRITERION.get(criterion.number)?.length ?? 0,
  };
}

function criterionLevelSummary(criterion: Criterion): Record<string, unknown> {
  return {
    status: criterion.criterionSummaryStatus,
    byRole: criterion.arrmResponsibilities,
    sourceUrl: META.dataset.sources.responsibilities,
    note: criterion.criterionSummaryStatus === 'missing'
      ? 'ARRM publishes no criterion-level summary for this criterion.'
      : SUMMARY_NOTE,
  };
}

function levelsForRole(task: Task, roleName: string): OwnershipLevel[] {
  return LEVELS.filter((level) => task.ownership[level].includes(roleName));
}

function taskView(task: Task): Record<string, unknown> {
  const criterion = CRITERION_BY_NUMBER.get(task.criterion);
  const roleLevels = ROLES
    .map((role) => ({ slug: role.slug, name: role.name, levels: levelsForRole(task, role.name) }))
    .filter((role) => role.levels.length > 0);
  return {
    recordType: 'arrm-task',
    taskId: task.id,
    criterionNumber: task.criterion,
    criterionName: criterion?.name ?? null,
    criterionLevel: criterion?.level ?? null,
    text: task.text,
    stage: task.stage ?? null,
    starter: task.starter ?? false,
    ownership: {
      primary: task.ownership.primary,
      secondary: task.ownership.secondary,
      contributor: task.ownership.contributor,
    },
    roleLevels,
    siteUrl: taskUrl(task),
    source: {
      page: ARRM_TASKS_URL,
      csv: META.dataset.sources.tasks,
      taskId: task.id,
      note: 'Task wording and ownership are published unchanged from W3C ARRM.',
    },
  };
}

function getDatasetInfo(): Record<string, unknown> {
  return {
    server: META.server,
    dataset: META.dataset,
    citation: META.citation,
    projectUrl: META.projectUrl,
    canonicalDataUrl: META.canonicalDataUrl,
    manifestUrl: META.manifestUrl,
    datasetLandingUrl: META.datasetLandingUrl,
    distributions: META.distributions,
    distributionNote:
      'Distribution URLs point at the published dataset site. The site manifest records ' +
      'the files and hashes actually published for the current site build.',
    roles: META.roles,
    tools: [
      { name: 'get_dataset_info', purpose: 'Revision, counts, citation and distribution URLs' },
      { name: 'search_accessibility', purpose: 'Bounded search, limit 1-50, opaque cursor' },
      { name: 'get_criterion', purpose: 'One criterion, source links and related ARRM tasks' },
      { name: 'get_arrm_task', purpose: 'One ARRM task and its recorded ownership' },
      { name: 'get_role_guidance', purpose: 'Explicit missing-review status and original task records' },
      { name: 'compare_roles', purpose: 'Recorded assignments for one criterion or task' },
    ],
    policies: {
      readOnly: true,
      noRuntimeNetworkFetch: true,
      noInferredOwnership: true,
      noConformanceDetermination: true,
      w3cEndorsed: META.attribution.w3cEndorsed,
      reviewedRoleGuidanceAvailable: META.guidancePolicy.reviewedRoleGuidanceAvailable,
      note: META.attribution.note,
    },
  };
}

function getCriterion(args: { criterion: string }): Record<string, unknown> {
  const criterion = lookupCriterion(args.criterion);
  const allTasks = TASKS_BY_CRITERION.get(criterion.number) ?? [];
  const tasks = allTasks.slice(0, MAX_TASKS_PER_RECORD);
  const notices = [
    SUMMARY_NOTE,
    'The summary is W3C-provided descriptive material, not the normative success criterion.',
  ];
  if (criterion.criterionSummaryStatus === 'missing') {
    notices.push('ARRM publishes no criterion-level summary for this criterion.');
  }
  if (allTasks.length === 0) {
    notices.push('No ARRM task is recorded for this criterion. The WCAG requirement still applies.');
  }
  if (tasks.length < allTasks.length) {
    notices.push(`Returning ${tasks.length} of ${allTasks.length} related tasks.`);
  }
  return {
    criterion: criterionView(criterion),
    criterionLevelSummary: criterionLevelSummary(criterion),
    relatedTaskCount: allTasks.length,
    returnedTaskCount: tasks.length,
    relatedTasks: tasks.map(taskView),
    comparisonUrl: compareUrl(criterion.number),
    notices,
  };
}

function getArrmTask(args: { task_id: string }): Record<string, unknown> {
  const task = lookupTask(args.task_id);
  const criterion = CRITERION_BY_NUMBER.get(task.criterion);
  if (!criterion) {
    throw new ToolError('INTERNAL', `Task ${task.id} refers to a missing criterion.`);
  }
  return {
    task: taskView(task),
    criterion: criterionView(criterion),
    criterionLevelSummary: criterionLevelSummary(criterion),
    notices: [
      'Task wording and ownership are published unchanged from W3C ARRM.',
      'A criterion summary is not task ownership. Read the task ownership above.',
      'A role may hold more than one ownership level on the same task.',
    ],
  };
}

function getRoleGuidance(args: {
  role: string;
  criterion?: string;
  task_id?: string;
}): Record<string, unknown> {
  const role = readRole(args.role);
  assertAtMostOne(args.criterion, args.task_id, 'get_role_guidance');

  const base: Record<string, unknown> = {
    role: { slug: role.slug, name: role.name, siteUrl: roleUrl(role.slug) },
    guidanceStatus: 'missing-reviewed-interpretation',
    reviewStatus: 'not-reviewed',
    interpretationRecords: [],
    policy: META.guidancePolicy,
    message:
      'No independently reviewed per-criterion role guidance is published. This server does ' +
      'not generate placeholder advice. Recorded ARRM ownership is never altered; where the ' +
      'data records no assignment, the response says "not recorded" rather than treating it ' +
      'as an exemption.',
  };

  if (args.task_id !== undefined) {
    const task = lookupTask(args.task_id);
    const levels = levelsForRole(task, role.name);
    return {
      ...base,
      task: taskView(task),
      roleAssignment: { recorded: levels.length > 0, levels },
      notices: levels.length > 0
        ? [`ARRM records ${levels.join(', ')} ownership for ${role.name} on ${task.id}.`]
        : [`ARRM records no task-level ownership for ${role.name} on ${task.id}. This is not an exemption.`],
    };
  }

  if (args.criterion !== undefined) {
    const criterion = lookupCriterion(args.criterion);
    const allTasks = TASKS_BY_CRITERION.get(criterion.number) ?? [];
    const roleTasks = allTasks.filter((task) => levelsForRole(task, role.name).length > 0);
    const roleLevels = criterion.arrmResponsibilities[role.name] ?? [];
    const tasks = roleTasks.slice(0, MAX_TASKS_PER_RECORD);
    return {
      ...base,
      criterion: criterionView(criterion),
      criterionLevelSummary: criterionLevelSummary(criterion),
      roleCriterionSummary: {
        role: role.name,
        levels: roleLevels,
        note: roleLevels.length > 0
          ? 'Criterion-level ARRM summary for this role. It does not assign individual tasks.'
          : 'ARRM publishes no criterion-level summary entry for this role. This is not an exemption.',
      },
      recordedTaskCount: roleTasks.length,
      otherTaskCount: allTasks.length - roleTasks.length,
      returnedTaskCount: tasks.length,
      tasks: tasks.map(taskView),
      notices: [
        NO_INFERENCE_NOTE,
        ...(roleTasks.length === 0
          ? [`ARRM records no task-level ownership for ${role.name} on criterion ${criterion.number}. This is not an exemption.`]
          : []),
        ...(tasks.length < roleTasks.length
          ? [`Returning ${tasks.length} of ${roleTasks.length} recorded tasks.`]
          : []),
      ],
    };
  }

  const criteria = DATASET.criteria
    .map((criterion) => {
      const roleTasks = (TASKS_BY_CRITERION.get(criterion.number) ?? [])
        .filter((task) => levelsForRole(task, role.name).length > 0);
      return {
        number: criterion.number,
        name: criterion.name,
        level: criterion.level,
        recordedTaskCount: roleTasks.length,
      };
    })
    .filter((criterion) => criterion.recordedTaskCount > 0);

  return {
    ...base,
    recordedTaskCount: DATASET.tasks
      .filter((task) => levelsForRole(task, role.name).length > 0)
      .length,
    criteriaTotal: DATASET.criteria.length,
    criteriaWithRecordedTasks: criteria,
    criteriaWithRecordedTaskCount: criteria.length,
    criteriaWithNoRecordedTaskCount: DATASET.criteria.length - criteria.length,
    tasksTotal: DATASET.tasks.length,
    notices: [
      NO_INFERENCE_NOTE,
      'Pass criterion or task_id for original task wording. This overview is bounded to counts.',
    ],
  };
}

function compareRoles(args: { criterion?: string; task_id?: string }): Record<string, unknown> {
  assertAtMostOne(args.criterion, args.task_id, 'compare_roles');
  if (args.criterion === undefined && args.task_id === undefined) {
    throw new ToolError(
      'INVALID_ARGUMENT',
      'compare_roles requires criterion or task_id.',
      'Pass one WCAG criterion number or one ARRM task ID.',
    );
  }

  if (args.task_id !== undefined) {
    const task = lookupTask(args.task_id);
    const assigned = {
      primary: task.ownership.primary,
      secondary: task.ownership.secondary,
      contributor: task.ownership.contributor,
    };
    const assignedNames = new Set([
      ...assigned.primary,
      ...assigned.secondary,
      ...assigned.contributor,
    ]);
    const unassignedRoles = ROLES
      .filter((role) => !assignedNames.has(role.name))
      .map((role) => ({ slug: role.slug, name: role.name }));
    return {
      mode: 'task',
      task: taskView(task),
      assignedRoles: assigned,
      unassignedRoles,
      notRecordedNote: NO_INFERENCE_NOTE,
      notices: ['This is a verbatim view of recorded ARRM ownership. No role was inferred.'],
    };
  }

  const criterion = lookupCriterion(args.criterion);
  const tasks = TASKS_BY_CRITERION.get(criterion.number) ?? [];
  const matrix = ROLES.map((role) => {
    const counts: Record<OwnershipLevel, number> = { primary: 0, secondary: 0, contributor: 0 };
    const taskIds: Record<OwnershipLevel, string[]> = { primary: [], secondary: [], contributor: [] };
    for (const task of tasks) {
      for (const level of LEVELS) {
        if (task.ownership[level].includes(role.name)) {
          counts[level] += 1;
          taskIds[level].push(task.id);
        }
      }
    }
    return {
      role: role.slug,
      roleName: role.name,
      counts,
      taskIds,
      recordedTaskCount: new Set(Object.values(taskIds).flat()).size,
    };
  });
  const rolesWithNoRecordedTask = matrix
    .filter((record) => record.recordedTaskCount === 0)
    .map((record) => ({ slug: record.role, name: record.roleName }));

  return {
    mode: 'criterion',
    criterion: criterionView(criterion),
    criterionLevelSummary: criterionLevelSummary(criterion),
    taskCount: tasks.length,
    roleMatrix: matrix,
    taskAssignments: tasks.map((task) => ({
      taskId: task.id,
      text: task.text,
      ownership: {
        primary: task.ownership.primary,
        secondary: task.ownership.secondary,
        contributor: task.ownership.contributor,
      },
    })),
    rolesWithNoRecordedTask,
    notRecordedNote: NO_INFERENCE_NOTE,
    notices: [
      'Counts include every task where the role appears at that level; a role can appear more than once across tasks.',
      'The criterion-level ARRM summary is shown separately and is not task ownership.',
    ],
  };
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: META.server.name, version: META.server.version },
    {
      instructions:
        'Read-only WCAG 2.2 and W3C ARRM reference data. Use get_dataset_info for revision and ' +
        'source URLs. Task-level ownership is authoritative; criterion-level ARRM summaries are ' +
        'not task ownership. No reviewed role guidance is published: get_role_guidance returns an ' +
        'explicit missing-review status and never invents advice. Do not infer conformance, ' +
        'diagnose issues, or assign responsibility beyond recorded task ownership. Every dataset ' +
        'result carries provenance and the dataset revision.',
    },
  );

  server.registerTool(
    'get_dataset_info',
    {
      title: 'Get dataset information',
      description:
        'Return the dataset revision, source URLs and SHA-256 hashes, counts, citation and ' +
        'published distribution URLs. Read-only; no arguments.',
      inputSchema: z.strictObject({}),
      annotations: READ_ONLY,
    },
    guarded(() => getDatasetInfo()),
  );

  server.registerTool(
    'search_accessibility',
    {
      title: 'Search WCAG criteria and ARRM tasks',
      description:
        'Search WCAG 2.2 criteria and W3C ARRM task references by text, criterion number or ' +
        'task ID. Returns at most 50 results per page with truncated snippets and an opaque ' +
        'cursor. Snippets are truncated only; full source wording is available from ' +
        'get_criterion and get_arrm_task.',
      inputSchema: z.strictObject({
        query: z.string(),
        limit: z.number().int().optional(),
        cursor: z.string().optional(),
      }),
      annotations: READ_ONLY,
    },
    guarded((args: { query: string; limit?: number; cursor?: string }) => {
      const input = readSearchInput(args);
      return {
        ...searchAccessibility(input),
        notices: [
          'Search matches every whitespace-separated term. Criterion numbers and ARRM task IDs are exact matches.',
          'A criterion with no related task still appears in results; no requirement is hidden.',
        ],
      };
    }),
  );

  server.registerTool(
    'get_criterion',
    {
      title: 'Get a WCAG success criterion',
      description:
        'Return one WCAG 2.2 success criterion by exact number (for example 2.4.7), its W3C ' +
        'source links, informative summary, criterion-level ARRM summary and related ARRM tasks ' +
        'with their task-level ownership.',
      inputSchema: z.strictObject({ criterion: z.string() }),
      annotations: READ_ONLY,
    },
    guarded((args: { criterion: string }) => getCriterion(args)),
  );

  server.registerTool(
    'get_arrm_task',
    {
      title: 'Get an ARRM task',
      description:
        'Return one W3C ARRM task by exact task ID (for example INP-017), including the ' +
        'original task wording, stage, and every recorded primary, secondary and contributor ' +
        'role assignment.',
      inputSchema: z.strictObject({ task_id: z.string() }),
      annotations: READ_ONLY,
    },
    guarded((args: { task_id: string }) => getArrmTask(args)),
  );

  server.registerTool(
    'get_role_guidance',
    {
      title: 'Get role guidance',
      description:
        'Return reviewed role-specific guidance when it exists. None is currently published: ' +
        'the response says so explicitly. With criterion or task_id it returns original ARRM ' +
        'task records; without either it returns bounded counts. The tool never fabricates ' +
        'advice or treats a missing assignment as an exemption.',
      inputSchema: z.strictObject({
        role: z.string(),
        criterion: z.string().optional(),
        task_id: z.string().optional(),
      }),
      annotations: READ_ONLY,
    },
    guarded((args: { role: string; criterion?: string; task_id?: string }) => getRoleGuidance(args)),
  );

  server.registerTool(
    'compare_roles',
    {
      title: 'Compare recorded role assignments',
      description:
        'Compare recorded W3C ARRM role assignments for one criterion or one task. Returns ' +
        'primary, secondary and contributor assignments as recorded. Roles with no recorded ' +
        'assignment are labelled "not recorded", never as exempt or responsible.',
      inputSchema: z.strictObject({
        criterion: z.string().optional(),
        task_id: z.string().optional(),
      }),
      annotations: READ_ONLY,
    },
    guarded((args: { criterion?: string; task_id?: string }) => compareRoles(args)),
  );

  return server;
}

export const TOOL_NAMES = [
  'get_dataset_info',
  'search_accessibility',
  'get_criterion',
  'get_arrm_task',
  'get_role_guidance',
  'compare_roles',
] as const;
