import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type CutoffDraftLine = {
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
};

export type CutoffDraftSummary = {
  id: string;
  cutoffDate: string;
  debit: number;
  credit: number;
  status: "DRAFT" | "SIGNED";
  createdBy?: string;
  lines: Array<{ accountId: string; debit: number; credit: number }>;
};

export type AssetOpeningSummary = {
  id: string;
  assetCode: string;
  cost: number;
  accumulatedDepreciation: number;
  status: "DRAFT";
};

export async function fetchCutoffDraftsApi(): Promise<CutoffDraftSummary[]> {
  requireLiveApi("Cutoff draft");
  const payload = await apiRequest<{ items: CutoffDraftSummary[] }>("/api/finance/cutoff-drafts");
  return payload.items ?? [];
}

export async function fetchAssetOpeningsApi(): Promise<AssetOpeningSummary[]> {
  requireLiveApi("Asset opening");
  const payload = await apiRequest<{ items: AssetOpeningSummary[] }>("/api/finance/asset-openings");
  return payload.items ?? [];
}

export async function createCutoffDraftApi(body: {
  cutoffDate: string;
  lines: CutoffDraftLine[];
}): Promise<{ id: string; status: string; posted: boolean }> {
  requireLiveApi("Cutoff draft");
  return apiRequest("/api/finance/cutoff-drafts", { method: "POST", body });
}

export async function signCutoffDraftApi(id: string): Promise<{ id: string; status: string; posted: boolean }> {
  requireLiveApi("Cutoff draft");
  return apiRequest(`/api/finance/cutoff-drafts/${encodeURIComponent(id)}/sign`, { method: "POST", body: {} });
}

export async function postCutoffDraftApi(id: string): Promise<{ posted: boolean; reason: string }> {
  requireLiveApi("Cutoff draft");
  return apiRequest(`/api/finance/cutoff-drafts/${encodeURIComponent(id)}/post`, { method: "POST", body: {} });
}

export async function createAssetOpeningApi(body: {
  assetCode: string;
  cost: number;
  accumulatedDepreciation: number;
}): Promise<{ id: string; status: string; posted: boolean }> {
  requireLiveApi("Asset opening");
  return apiRequest("/api/finance/asset-openings", { method: "POST", body });
}

export async function postAssetOpeningApi(id: string): Promise<{ posted: boolean; reason: string }> {
  requireLiveApi("Asset opening");
  return apiRequest(`/api/finance/asset-openings/${encodeURIComponent(id)}/post`, { method: "POST", body: {} });
}
