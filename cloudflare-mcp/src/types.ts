/** Types for the generated dataset bundle. See scripts/build_dataset.py. */

export type OwnershipLevel = 'primary' | 'secondary' | 'contributor';

export interface InBrief {
  goal?: string;
  whatToDo?: string;
  authorTask?: string;
  whyImportant?: string;
}

export interface Criterion {
  number: string;
  slug: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  principle?: string;
  guideline?: string;
  normativeUrl: string;
  understandingUrl: string;
  versions?: string[];
  summary?: string;
  arrmResponsibilities: Record<string, OwnershipLevel[]>;
  criterionSummaryStatus: 'recorded' | 'missing';
  inBrief?: InBrief;
  mapped: boolean;
}

export interface TaskOwnership {
  primary: string[];
  secondary: string[];
  contributor: string[];
}

export interface Task {
  id: string;
  criterion: string;
  text: string;
  stage?: string;
  starter?: boolean;
  ownership: TaskOwnership;
}

export interface Dataset {
  schemaVersion: number;
  wcagVersion: string;
  mode: string;
  generatedAt: string;
  sources: {
    wcag: string;
    tasks: string;
    responsibilities: string;
  };
  sourceSHA256: {
    wcag: string;
    tasks: string;
    responsibilities: string;
  };
  criteria: Criterion[];
  tasks: Task[];
  roles: string[];
}

export interface RoleRecord {
  slug: string;
  name: string;
}

export interface Distribution {
  label: string;
  url: string;
  encodingFormat: string;
}

export interface DatasetMeta {
  metaVersion: number;
  server: { name: string; version: string };
  dataset: {
    schemaVersion: number;
    wcagVersion: string;
    mode: string;
    generatedAt: string;
    revision: string;
    sha256: string;
    canonicalBytes: number;
    hashMethod: string;
    counts: { criteria: number; tasks: number; roles: number };
    sources: Dataset['sources'];
    sourceSHA256: Dataset['sourceSHA256'];
  };
  roles: RoleRecord[];
  distributionBaseUrl: string;
  distributions: Distribution[];
  canonicalDataUrl: string;
  manifestUrl: string;
  datasetLandingUrl: string;
  citation: string;
  projectUrl: string;
  attribution: { w3cEndorsed: boolean; note: string };
  guidancePolicy: { reviewedRoleGuidanceAvailable: boolean; note: string };
}
