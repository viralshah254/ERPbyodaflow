import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type MasterDataChange = {
  _id: string;
  entityType: string;
  entityId: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  proposedData: Record<string, unknown>;
};

export async function fetchMasterDataChangesApi(status?: string): Promise<MasterDataChange[]> {
  requireLiveApi("Master data changes");
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const payload = await apiRequest<{ items: MasterDataChange[] }>("/api/governance/master-data/changes", { params });
  return payload.items ?? [];
}

export async function approveMasterDataChangeApi(id: string): Promise<void> {
  requireLiveApi("Approve master data change");
  await apiRequest(`/api/governance/master-data/changes/${encodeURIComponent(id)}/approve`, { method: "POST" });
}
