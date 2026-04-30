import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AssetAssignmentRow, AssetRow, CustodyType, DepreciationMethod } from "@/lib/types/assets";

type BackendAsset = {
  id: string;
  _id?: string;
  code: string;
  name: string;
  category?: string;
  categoryId?: string;
  branchId?: string;
  serialNumber?: string;
  assetTag?: string;
  model?: string;
  inServiceDate?: string;
  usefulLifeMonths?: number;
  depreciationRatePct?: number;
  acquisitionDate: string;
  cost: number;
  salvageValue?: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  linkedVendorId?: string;
  linkedInvoiceId?: string;
  status: AssetRow["status"];
  accumulatedDepreciation?: number;
  currentCustodyType?: CustodyType;
  currentCustodianOutletId?: string;
  currentCustodianEmployeeId?: string;
  custodySince?: string;
  custodianEmployeeName?: string;
  custodianOutletName?: string;
};

function sliceDate(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  return value.slice(0, 10);
}

export function mapAsset(asset: BackendAsset): AssetRow {
  return {
    id: asset.id ?? asset._id ?? "",
    code: asset.code,
    name: asset.name,
    category: asset.category ?? "Other",
    categoryId: asset.categoryId,
    branchId: asset.branchId,
    serialNumber: asset.serialNumber,
    assetTag: asset.assetTag,
    model: asset.model,
    inServiceDate: sliceDate(asset.inServiceDate),
    usefulLifeMonths: asset.usefulLifeMonths,
    depreciationRatePct: asset.depreciationRatePct,
    acquisitionDate: sliceDate(asset.acquisitionDate) ?? "",
    cost: asset.cost,
    salvage: asset.salvageValue ?? 0,
    usefulLifeYears: asset.usefulLifeYears,
    depreciationMethod: asset.depreciationMethod,
    linkedVendorId: asset.linkedVendorId,
    linkedInvoiceId: asset.linkedInvoiceId,
    status: asset.status,
    accumulatedDepreciation: asset.accumulatedDepreciation,
    currentCustodyType: asset.currentCustodyType,
    currentCustodianOutletId: asset.currentCustodianOutletId,
    currentCustodianEmployeeId: asset.currentCustodianEmployeeId,
    custodySince: sliceDate(asset.custodySince),
    custodianEmployeeName: asset.custodianEmployeeName,
    custodianOutletName: asset.custodianOutletName,
  };
}

export type FetchAssetsFilters = {
  custodyType?: CustodyType;
  custodianOutletId?: string;
  custodianEmployeeId?: string;
};

export async function fetchAssetsApi(filters?: FetchAssetsFilters): Promise<AssetRow[]> {
  requireLiveApi("Asset register");
  const params = new URLSearchParams();
  if (filters?.custodyType) params.set("custodyType", filters.custodyType);
  if (filters?.custodianOutletId) params.set("custodianOutletId", filters.custodianOutletId);
  if (filters?.custodianEmployeeId) params.set("custodianEmployeeId", filters.custodianEmployeeId);
  const payload = await apiRequest<{ items: BackendAsset[] }>("/api/assets/register", {
    params,
  });
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

export async function fetchAssetAssignmentsApi(assetId: string): Promise<AssetAssignmentRow[]> {
  requireLiveApi("Asset assignments");
  const payload = await apiRequest<{ items: Array<AssetAssignmentRow & { _id?: string }> }>(
    `/api/assets/register/${encodeURIComponent(assetId)}/assignments`
  );
  return (payload.items ?? []).map((row) => ({
    ...row,
    id: row.id ?? row._id ?? "",
    effectiveFrom: sliceDate(row.effectiveFrom) ?? "",
    effectiveTo: row.effectiveTo != null ? sliceDate(String(row.effectiveTo)) : row.effectiveTo,
  }));
}

export async function fetchOutletEquipmentApi(outletOrgId: string): Promise<AssetRow[]> {
  requireLiveApi("Outlet equipment");
  const payload = await apiRequest<{ items: BackendAsset[] }>(
    `/api/assets/outlet/${encodeURIComponent(outletOrgId)}/equipment`
  );
  return (payload.items ?? []).map(mapAsset);
}

export type AssignCustodyPayload = {
  custodyType: CustodyType;
  effectiveFrom?: string;
  custodianOutletId?: string;
  custodianEmployeeId?: string;
  monthlyEquipmentFee?: number;
  securityDepositAmount?: number;
  currency?: string;
  notes?: string;
  attachmentUrl?: string;
};

export async function assignAssetCustodyApi(
  assetId: string,
  body: AssignCustodyPayload
): Promise<{ assignmentId: string }> {
  requireLiveApi("Assign asset custody");
  return apiRequest<{ assignmentId: string }>(`/api/assets/register/${encodeURIComponent(assetId)}/assign`, {
    method: "POST",
    body,
  });
}

export async function createAssetApi(
  body: Omit<AssetRow, "id" | "custodianEmployeeName" | "custodianOutletName"> & { status?: AssetRow["status"] }
): Promise<{ id: string }> {
  requireLiveApi("Create asset");
  return apiRequest<{ id: string }>("/api/assets/register", {
    method: "POST",
    body: {
      code: body.code,
      name: body.name,
      category: body.category,
      categoryId: body.categoryId,
      branchId: body.branchId,
      serialNumber: body.serialNumber,
      assetTag: body.assetTag,
      model: body.model,
      inServiceDate: body.inServiceDate,
      usefulLifeMonths: body.usefulLifeMonths,
      depreciationRatePct: body.depreciationRatePct,
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

export async function updateAssetApi(
  id: string,
  body: Partial<
    Omit<AssetRow, "id" | "custodianEmployeeName" | "custodianOutletName"> & { salvage?: number }
  >
): Promise<void> {
  requireLiveApi("Update asset");
  await apiRequest(`/api/assets/register/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.branchId !== undefined ? { branchId: body.branchId || null } : {}),
      ...(body.serialNumber !== undefined ? { serialNumber: body.serialNumber || null } : {}),
      ...(body.assetTag !== undefined ? { assetTag: body.assetTag || null } : {}),
      ...(body.model !== undefined ? { model: body.model || null } : {}),
      ...(body.inServiceDate !== undefined ? { inServiceDate: body.inServiceDate || null } : {}),
      ...(body.usefulLifeMonths !== undefined ? { usefulLifeMonths: body.usefulLifeMonths } : {}),
      ...(body.depreciationRatePct !== undefined ? { depreciationRatePct: body.depreciationRatePct } : {}),
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
