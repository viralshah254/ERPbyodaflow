import { apiRequest, requireLiveApi } from "./client";

export type CommissionDefaultRow = {
  id: string;
  productId: string;
  commissionPerUnit: number;
  orgDefaultCommission?: number | null;
  sku?: string | null;
  productName?: string | null;
};

export type FetchCommissionDefaultsParams = {
  productIds?: string[];
  limit?: number;
  cursor?: string;
  includeProductDetails?: boolean;
  search?: string;
};

export async function fetchOrgCommissionDefaultsApi(
  params?: FetchCommissionDefaultsParams
): Promise<{ items: CommissionDefaultRow[]; nextCursor: string | null }> {
  requireLiveApi("Org commission defaults");
  const sp = new URLSearchParams();
  if (params?.productIds?.length) sp.set("productIds", params.productIds.slice(0, 100).join(","));
  if (params?.limit != null && params.limit > 0) sp.set("limit", String(params.limit));
  if (params?.cursor != null && params.cursor !== "") sp.set("cursor", params.cursor);
  if (params?.includeProductDetails) sp.set("includeProductDetails", "true");
  if (params?.search?.trim()) sp.set("search", params.search.trim());
  const qs = sp.toString();
  const path = `/api/franchise/commission/defaults/org${qs ? `?${qs}` : ""}`;
  const res = await apiRequest<{ items: CommissionDefaultRow[]; nextCursor?: string | null }>(path);
  return { items: res.items ?? [], nextCursor: res.nextCursor ?? null };
}

export async function putOrgCommissionDefaultsApi(
  items: Array<{ productId: string; commissionPerUnit: number }>
): Promise<CommissionDefaultRow[]> {
  requireLiveApi("Update org commission defaults");
  const res = await apiRequest<{ items: CommissionDefaultRow[] }>(
    "/api/franchise/commission/defaults/org",
    { method: "PUT", body: { items } }
  );
  return res.items ?? [];
}

export async function fetchZoneCommissionDefaultsApi(
  zoneId: string,
  params?: FetchCommissionDefaultsParams
): Promise<{ items: CommissionDefaultRow[]; nextCursor: string | null }> {
  requireLiveApi("Zone commission defaults");
  const sp = new URLSearchParams();
  if (params?.productIds?.length) sp.set("productIds", params.productIds.slice(0, 100).join(","));
  if (params?.limit != null && params.limit > 0) sp.set("limit", String(params.limit));
  if (params?.cursor != null && params.cursor !== "") sp.set("cursor", params.cursor);
  if (params?.includeProductDetails) sp.set("includeProductDetails", "true");
  if (params?.search?.trim()) sp.set("search", params.search.trim());
  const qs = sp.toString();
  const path = `/api/franchise/commission/defaults/zones/${encodeURIComponent(zoneId)}${qs ? `?${qs}` : ""}`;
  const res = await apiRequest<{ items: CommissionDefaultRow[]; nextCursor?: string | null }>(path);
  return { items: res.items ?? [], nextCursor: res.nextCursor ?? null };
}

export async function putZoneCommissionDefaultsApi(
  zoneId: string,
  items: Array<{ productId: string; commissionPerUnit: number }>
): Promise<CommissionDefaultRow[]> {
  requireLiveApi("Update zone commission defaults");
  const res = await apiRequest<{ items: CommissionDefaultRow[] }>(
    `/api/franchise/commission/defaults/zones/${encodeURIComponent(zoneId)}`,
    { method: "PUT", body: { items } }
  );
  return res.items ?? [];
}
