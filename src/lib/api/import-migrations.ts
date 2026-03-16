import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type {
  CreateImportRunInput,
  ImportConflictResolution,
  ImportBatchRow,
  ImportProvider,
  ImportReconciliationDashboard,
  ImportRowErrorRow,
  ImportRunStatus,
  ImportRunRow,
  ImportStageRecordStatus,
  ImportStageRecordRow,
} from "@/lib/types/import-migrations";

type BackendRecord = Record<string, unknown> & { _id?: string; id?: string };

type BackendRun = BackendRecord & {
  provider: ImportProvider;
  status: ImportRunStatus;
  dryRun: boolean;
  entityTypes?: string[];
  dependencyPlan?: string[];
  requestedBy?: string;
  startedAt?: string;
  completedAt?: string;
  sourceMeta?: Record<string, unknown>;
  summary?: Partial<ImportRunRow["summary"]>;
};

type BackendBatch = BackendRecord & {
  runId: string;
  provider: string;
  entityType: string;
  dependencyOrder: number;
  status: ImportBatchRow["status"];
  startedAt?: string;
  completedAt?: string;
  summary?: Partial<ImportBatchRow["summary"]>;
};

type BackendRowError = BackendRecord & {
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
  createdAt?: string;
};

type BackendStageRecord = BackendRecord & {
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
  proposedAction?: ImportStageRecordRow["proposedAction"];
  status: ImportStageRecordStatus;
  errorCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

function getId(item: BackendRecord): string {
  return String(item.id ?? item._id ?? "");
}

function mapRun(item: BackendRun): ImportRunRow {
  return {
    id: getId(item),
    provider: item.provider,
    status: item.status,
    dryRun: item.dryRun,
    entityTypes: item.entityTypes ?? [],
    dependencyPlan: item.dependencyPlan ?? [],
    requestedBy: item.requestedBy ?? "",
    startedAt: item.startedAt ?? "",
    completedAt: item.completedAt,
    sourceMeta: item.sourceMeta,
    summary: {
      totalRecords: item.summary?.totalRecords ?? 0,
      created: item.summary?.created ?? 0,
      updated: item.summary?.updated ?? 0,
      skipped: item.summary?.skipped ?? 0,
      conflicted: item.summary?.conflicted ?? 0,
      failed: item.summary?.failed ?? 0,
    },
  };
}

function mapBatch(item: BackendBatch): ImportBatchRow {
  return {
    id: getId(item),
    runId: item.runId,
    provider: item.provider,
    entityType: item.entityType,
    dependencyOrder: item.dependencyOrder,
    status: item.status,
    startedAt: item.startedAt ?? "",
    completedAt: item.completedAt,
    summary: {
      totalRecords: item.summary?.totalRecords ?? 0,
      created: item.summary?.created ?? 0,
      updated: item.summary?.updated ?? 0,
      skipped: item.summary?.skipped ?? 0,
      conflicted: item.summary?.conflicted ?? 0,
      failed: item.summary?.failed ?? 0,
    },
  };
}

function mapRowError(item: BackendRowError): ImportRowErrorRow {
  return {
    id: getId(item),
    runId: item.runId,
    batchId: item.batchId,
    stageRecordId: item.stageRecordId,
    entityType: item.entityType,
    rowNumber: item.rowNumber,
    externalId: item.externalId,
    code: item.code,
    message: item.message,
    severity: item.severity,
    details: item.details,
    createdAt: item.createdAt ?? "",
  };
}

function mapStageRecord(item: BackendStageRecord): ImportStageRecordRow {
  return {
    id: getId(item),
    runId: item.runId,
    batchId: item.batchId,
    provider: item.provider,
    entityType: item.entityType,
    rowNumber: item.rowNumber,
    externalId: item.externalId,
    sourcePayload: item.sourcePayload,
    normalizedPayload: item.normalizedPayload,
    matchedEntityId: item.matchedEntityId,
    matchReason: item.matchReason,
    proposedAction: item.proposedAction,
    status: item.status,
    errorCount: item.errorCount ?? 0,
    createdAt: item.createdAt ?? "",
    updatedAt: item.updatedAt ?? "",
  };
}

export async function createImportRunApi(input: CreateImportRunInput): Promise<ImportRunRow> {
  requireLiveApi("Import runs");
  const payload = await apiRequest<{ run: BackendRun }>("/api/import/runs", {
    method: "POST",
    body: input,
  });
  return mapRun(payload.run);
}

export async function fetchImportRunsApi(filters?: {
  provider?: string;
  status?: string;
}): Promise<ImportRunRow[]> {
  requireLiveApi("Import runs");
  const params = new URLSearchParams();
  if (filters?.provider) params.set("provider", filters.provider);
  if (filters?.status) params.set("status", filters.status);
  const payload = await apiRequest<{ items: BackendRun[] }>("/api/import/runs", { params });
  return (payload.items ?? []).map(mapRun);
}

export async function fetchImportRunApi(id: string): Promise<ImportRunRow> {
  requireLiveApi("Import run");
  const payload = await apiRequest<BackendRun>(`/api/import/runs/${encodeURIComponent(id)}`);
  return mapRun(payload);
}

export async function fetchImportRunBatchesApi(id: string): Promise<ImportBatchRow[]> {
  requireLiveApi("Import run batches");
  const payload = await apiRequest<{ items: BackendBatch[] }>(`/api/import/runs/${encodeURIComponent(id)}/batches`);
  return (payload.items ?? []).map(mapBatch);
}

export async function fetchImportRunErrorsApi(id: string): Promise<ImportRowErrorRow[]> {
  requireLiveApi("Import run errors");
  const payload = await apiRequest<{ items: BackendRowError[] }>(`/api/import/runs/${encodeURIComponent(id)}/errors`);
  return (payload.items ?? []).map(mapRowError);
}

export async function fetchImportRunStageRecordsApi(
  id: string,
  filters?: { entityType?: string; status?: string }
): Promise<ImportStageRecordRow[]> {
  requireLiveApi("Import stage records");
  const params = new URLSearchParams();
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.status) params.set("status", filters.status);
  const payload = await apiRequest<{ items: BackendStageRecord[] }>(
    `/api/import/runs/${encodeURIComponent(id)}/staged-records`,
    { params }
  );
  return (payload.items ?? []).map(mapStageRecord);
}

export async function fetchImportReconciliationDashboardApi(): Promise<ImportReconciliationDashboard> {
  requireLiveApi("Import reconciliation dashboard");
  const payload = await apiRequest<{
    runs: BackendRun[];
    byProvider: ImportReconciliationDashboard["byProvider"];
    recentErrors: BackendRowError[];
  }>("/api/import/reconciliation/dashboard");
  return {
    runs: (payload.runs ?? []).map(mapRun),
    byProvider: payload.byProvider ?? [],
    recentErrors: (payload.recentErrors ?? []).map(mapRowError),
  };
}

export async function resolveImportStageRecordApi(input: {
  id: string;
  resolution: ImportConflictResolution;
  matchedEntityId?: string;
}): Promise<ImportStageRecordRow> {
  requireLiveApi("Resolve import stage record");
  const payload = await apiRequest<{ item: BackendStageRecord }>(`/api/import/staged-records/${encodeURIComponent(input.id)}/resolve`, {
    method: "POST",
    body: {
      resolution: input.resolution,
      matchedEntityId: input.matchedEntityId,
    },
  });
  return mapStageRecord(payload.item);
}

export async function approveImportStageRecordApi(id: string): Promise<ImportStageRecordRow> {
  requireLiveApi("Approve import stage record");
  const payload = await apiRequest<{ item: BackendStageRecord }>(`/api/import/staged-records/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
  return mapStageRecord(payload.item);
}

export async function retryImportStageRecordApi(id: string): Promise<ImportStageRecordRow> {
  requireLiveApi("Retry import stage record");
  const payload = await apiRequest<{ item: BackendStageRecord }>(`/api/import/staged-records/${encodeURIComponent(id)}/retry`, {
    method: "POST",
  });
  return mapStageRecord(payload.item);
}
