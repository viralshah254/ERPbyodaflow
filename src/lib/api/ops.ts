import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type OpsRunbookPayload = {
  retention: { lastRunAt: string | null; status: string; deletedCount?: number };
  dependencies: Array<{ key: string; label: string; status: "READY" | "BLOCKED" | "WARN"; notes?: string }>;
  releaseGates: Array<{ key: string; label: string; checked: boolean; owner?: string }>;
};

export async function fetchOpsRunbookApi(): Promise<OpsRunbookPayload> {
  requireLiveApi("Operations runbook");
  return apiRequest<OpsRunbookPayload>("/api/ops/runbook");
}

export async function saveOpsRunbookApi(payload: OpsRunbookPayload): Promise<void> {
  requireLiveApi("Save operations runbook");
  await apiRequest("/api/ops/runbook", { method: "PUT", body: payload });
}

export type AuditRetentionPreview = { contract: "audit-retention-preview-v1"; dryRun: true; eligibleCount: number; days: number; minimumDays: number; cutoff: string };
export async function previewRetentionJobApi(days: number): Promise<AuditRetentionPreview> {
  const result = await apiRequest<AuditRetentionPreview>(`/api/ops/runbook/retention/preview?days=${encodeURIComponent(days)}`);
  if (result.contract !== "audit-retention-preview-v1" || result.dryRun !== true) throw new Error("Update the backend before using retention preview.");
  return result;
}
export async function runRetentionJobApi(preview: AuditRetentionPreview, confirmation: string): Promise<{ deletedCount: number }> {
  requireLiveApi("Run retention job");
  return apiRequest("/api/ops/runbook/retention/enforce", {
    method: "POST", body: { days: preview.days, dryRun: false, previewCutoff: preview.cutoff, confirmation },
  });
}
