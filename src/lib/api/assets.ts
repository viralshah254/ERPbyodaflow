import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AssetRow, DepreciationMethod } from "@/lib/types/assets";

type BackendAsset = {
  id: string;
  code: string;
  name: string;
  category?: string;
  acquisitionDate: string;
  cost: number;
  salvageValue?: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod | "REDUCING_BALANCE";
  linkedVendorId?: string;
  linkedInvoiceId?: string;
  status: "ACTIVE" | "DISPOSED" | "FULLY_DEPRECIATED";
};

function mapAsset(asset: BackendAsset): AssetRow {
  return {
    id: asset.id,
    code: asset.code,
    name: asset.name,
    category: asset.category ?? "Other",
    acquisitionDate: asset.acquisitionDate.slice(0, 10),
    cost: asset.cost,
    salvage: asset.salvageValue ?? 0,
    usefulLifeYears: asset.usefulLifeYears,
    depreciationMethod: asset.depreciationMethod === "REDUCING_BALANCE" ? "STRAIGHT_LINE" : asset.depreciationMethod,
    linkedVendorId: asset.linkedVendorId,
    linkedInvoiceId: asset.linkedInvoiceId,
    status: asset.status === "FULLY_DEPRECIATED" ? "DISPOSED" : asset.status,
  };
}

export async function fetchAssetsApi(): Promise<AssetRow[]> {
  requireLiveApi("Asset register");
  const payload = await apiRequest<{ items: BackendAsset[] }>("/api/assets/register");
  return (payload.items ?? []).map(mapAsset);
}

export async function fetchAssetByIdApi(id: string): Promise<AssetRow | null> {
  requireLiveApi("Asset detail");
  try {
    const payload = await apiRequest<BackendAsset>(`/api/assets/register/${encodeURIComponent(id)}`);
    return mapAsset(payload);
  } catch {
    return null;
  }
}

export async function createAssetApi(body: Omit<AssetRow, "id">): Promise<{ id: string }> {
  requireLiveApi("Create asset");
  return apiRequest<{ id: string }>("/api/assets/register", {
    method: "POST",
    body: {
      code: body.code,
      name: body.name,
      category: body.category,
      acquisitionDate: body.acquisitionDate,
      cost: body.cost,
      salvageValue: body.salvage,
      usefulLifeYears: body.usefulLifeYears,
      depreciationMethod: body.depreciationMethod,
      linkedVendorId: body.linkedVendorId,
      linkedInvoiceId: body.linkedInvoiceId,
    },
  });
}

export async function updateAssetApi(id: string, body: Partial<Omit<AssetRow, "id">>): Promise<void> {
  requireLiveApi("Update asset");
  await apiRequest(`/api/assets/register/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.acquisitionDate !== undefined ? { acquisitionDate: body.acquisitionDate } : {}),
      ...(body.cost !== undefined ? { cost: body.cost } : {}),
      ...(body.salvage !== undefined ? { salvageValue: body.salvage } : {}),
      ...(body.usefulLifeYears !== undefined ? { usefulLifeYears: body.usefulLifeYears } : {}),
      ...(body.depreciationMethod !== undefined ? { depreciationMethod: body.depreciationMethod } : {}),
      ...(body.linkedVendorId !== undefined ? { linkedVendorId: body.linkedVendorId || null } : {}),
      ...(body.linkedInvoiceId !== undefined ? { linkedInvoiceId: body.linkedInvoiceId || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });
}
