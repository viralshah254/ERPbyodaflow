import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { DisposalRow } from "@/lib/types/assets";

type BackendDisposal = {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  disposalDate: string;
  salePrice: number;
  bookValue: number;
  gainLoss: number;
  reason?: string;
  status: "DRAFT" | "POSTED";
  journalId?: string;
};

export async function fetchAssetDisposalsApi(): Promise<DisposalRow[]> {
  requireLiveApi("Asset disposals");
  const payload = await apiRequest<{ items: BackendDisposal[] }>("/api/assets/disposals");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    assetId: item.assetId,
    assetCode: item.assetCode,
    assetName: item.assetName,
    disposalDate: item.disposalDate.slice(0, 10),
    salePrice: item.salePrice ?? 0,
    bookValue: item.bookValue ?? 0,
    gainLoss: item.gainLoss ?? 0,
    reason: item.reason ?? "",
    status: item.status,
      journalId: item.journalId,
  }));
}

export async function createAssetDisposalApi(payload: {
  assetId: string;
  disposalDate: string;
  proceeds: number;
  reason?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create asset disposal");
  return apiRequest<{ id: string }>("/api/assets/disposals", {
    method: "POST",
    body: payload,
  });
}
