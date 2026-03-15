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

export async function runRetentionJobApi(days?: number): Promise<{ deletedCount: number }> {
  requireLiveApi("Run retention job");
  return apiRequest<{ deletedCount: number }>("/api/ops/runbook/retention/enforce", {
    method: "POST",
    body: { days },
  });
}
