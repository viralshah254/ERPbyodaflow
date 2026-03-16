export type ImportProvider = "ZOHO_BOOKS" | "QUICKBOOKS" | "SAP_B1";
export type ImportRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

export type ImportBatchStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

export type ImportStageRecordStatus =
  | "STAGED"
  | "VALIDATED"
  | "DRY_RUN"
  | "IMPORTED"
  | "SKIPPED"
  | "CONFLICT"
  | "FAILED";

export type ImportProposedAction = "CREATE" | "UPDATE" | "SKIP" | "CONFLICT";
export type ImportConflictResolution = "USE_EXISTING" | "CREATE_NEW" | "SKIP";

export interface ImportRunRow {
  id: string;
  provider: ImportProvider;
  status: ImportRunStatus;
  dryRun: boolean;
  entityTypes: string[];
  dependencyPlan: string[];
  requestedBy: string;
  startedAt: string;
  completedAt?: string;
  summary: {
    totalRecords: number;
    created: number;
    updated: number;
    skipped: number;
    conflicted: number;
    failed: number;
  };
  sourceMeta?: Record<string, unknown>;
}

export interface ImportBatchRow {
  id: string;
  runId: string;
  provider: string;
  entityType: string;
  dependencyOrder: number;
  status: ImportBatchStatus;
  startedAt: string;
  completedAt?: string;
  summary: {
    totalRecords: number;
    created: number;
    updated: number;
    skipped: number;
    conflicted: number;
    failed: number;
  };
}

export interface ImportRowErrorRow {
  id: string;
  runId: string;
  batchId: string;
  stageRecordId?: string;
  entityType: string;
  rowNumber: number;
  externalId?: string;
  code: string;
  message: string;
  severity: "warning" | "error";
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface ImportStageRecordRow {
  id: string;
  runId: string;
  batchId: string;
  provider: string;
  entityType: string;
  rowNumber: number;
  externalId?: string;
  sourcePayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown>;
  matchedEntityId?: string;
  matchReason?: string;
  proposedAction?: ImportProposedAction;
  status: ImportStageRecordStatus;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportReconciliationDashboard {
  runs: ImportRunRow[];
  byProvider: Array<{
    provider: string;
    runs: number;
    created: number;
    updated: number;
    failed: number;
    conflicted: number;
  }>;
  recentErrors: ImportRowErrorRow[];
}

export interface CreateImportRunInput {
  provider: ImportProvider;
  dryRun: boolean;
  profileId?: string;
  payload: Record<string, unknown>;
  sourceMeta?: Record<string, unknown>;
}
