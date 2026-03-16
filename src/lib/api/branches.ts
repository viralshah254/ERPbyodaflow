import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type BranchRow = {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
  address?: {
    line1?: string;
    city?: string;
    region?: string;
    country?: string;
  };
};

export async function fetchBranchesApi(): Promise<BranchRow[]> {
  requireLiveApi("Branches");
  const payload = await apiRequest<{ items: BranchRow[] }>("/api/settings/branches");
  return payload.items ?? [];
}

export async function createBranchApi(payload: {
  name: string;
  code?: string;
  address?: BranchRow["address"];
}): Promise<{ id: string }> {
  requireLiveApi("Create branch");
  return apiRequest<{ id: string }>("/api/settings/branches", {
    method: "POST",
    body: payload,
  });
}

export async function updateBranchApi(
  id: string,
  payload: Partial<{ name: string; code: string; address: BranchRow["address"]; isDefault: boolean }>
): Promise<BranchRow> {
  requireLiveApi("Update branch");
  return apiRequest<BranchRow>(`/api/settings/branches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function setDefaultBranchApi(id: string): Promise<void> {
  requireLiveApi("Set default branch");
  await apiRequest(`/api/settings/branches/${encodeURIComponent(id)}/set-default`, {
    method: "POST",
  });
}
