/**
 * Pricing rules API — discount policies and customer default price lists.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";
import { sortProductsByFamilyThenName } from "@/lib/products/product-family";
import type { DiscountPolicy, PriceList, PriceListChannel } from "@/lib/products/pricing-types";

const ENGINE_TO_CATALOG_LABEL: Record<string, PriceListChannel> = {
  DISTRIBUTOR: "Distributor",
  FRANCHISE: "Franchise",
  RETAIL: "Retail",
  INSTITUTIONAL: "ModernTrade",
  BULK_EXPORT: "Export",
};

/** Map backend `code` (catalog label) and `channel` (engine) to UI catalog label. */
export function resolveCatalogLabel(code?: string, engineChannel?: string): PriceListChannel {
  if (code?.trim()) return code.trim() as PriceListChannel;
  if (engineChannel && ENGINE_TO_CATALOG_LABEL[engineChannel]) {
    return ENGINE_TO_CATALOG_LABEL[engineChannel];
  }
  return "Retail";
}

/** Customer default price list assignment (API shape). */
export interface CustomerDefaultPriceListRow {
  customerId: string;
  customerName?: string;
  customerCode?: string;
  channel?: string;
  priceListId: string;
  priceListName?: string;
  customerCategoryId?: string;
  /** "party" = explicitly set on the customer; "category" = inherited from their customer category. */
  source?: "party" | "category";
  customerCurrency?: string;
  paymentTermsId?: string;
}

export interface PricingOption {
  id: string;
  name: string;
}

export interface PriceListDetail {
  id: string;
  name: string;
  code?: string;
  currency: string;
  items: Array<{
    productId: string;
    price: number;
    currency?: string;
    /** FMCG: discount % on this tag for the SKU. */
    discountPercent?: number;
  }>;
  channel?: string;
  tier?: string;
  zoneId?: string;
  customerId?: string;
  franchiseId?: string;
  lastCalculatedAt?: string;
  updatedAt?: string;
  parentPriceListId?: string;
  parentName?: string;
  markupType?: "PERCENT" | "FLAT";
  markupValue?: number;
}

// ——— Discount policies ———

export async function fetchDiscountPolicies(): Promise<DiscountPolicy[]> {
  requireLiveApi("Discount policies");
  const res = await apiRequest<{ items: DiscountPolicy[] }>("/api/pricing/policies");
  return res.items ?? [];
}

export async function createDiscountPolicy(body: {
  name: string;
  type: string;
  requiresApproval?: boolean;
  startDate?: string;
  endDate?: string;
}): Promise<DiscountPolicy> {
  requireLiveApi("Create discount policy");
  const res = await apiRequest<DiscountPolicy>("/api/pricing/policies", { method: "POST", body });
  return res;
}

export async function updateDiscountPolicy(
  id: string,
  body: Partial<{ name: string; type: string; requiresApproval: boolean; startDate: string; endDate: string }>
): Promise<DiscountPolicy> {
  requireLiveApi("Update discount policy");
  return apiRequest<DiscountPolicy>(`/api/pricing/policies/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

/** Request approval for a policy (optional workflow). */
export async function requestPolicyApproval(id: string, comment?: string): Promise<void> {
  requireLiveApi("Request discount policy approval");
  await apiRequest(`/api/pricing/policies/${encodeURIComponent(id)}/request-approval`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

// ——— Customer default price list ———

export async function fetchCustomerDefaultPriceLists(opts?: {
  search?: string;
  channel?: string;
}): Promise<CustomerDefaultPriceListRow[]> {
  requireLiveApi("Customer default price lists");
  const params = new URLSearchParams();
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.channel?.trim()) params.set("channel", opts.channel.trim());
  const res = await apiRequest<{ items: CustomerDefaultPriceListRow[] }>(
    "/api/pricing/customer-default-price-lists",
    { params },
  );
  return res.items ?? [];
}

export async function setCustomerDefaultPriceList(customerId: string, priceListId: string): Promise<void> {
  requireLiveApi("Set customer default price list");
  await apiRequest("/api/pricing/customer-default-price-lists", {
    method: "POST",
    body: { customerId, priceListId },
  });
}

export async function clearCustomerDefaultPriceList(customerId: string): Promise<void> {
  requireLiveApi("Clear customer default price list");
  await apiRequest(
    `/api/pricing/customer-default-price-lists/${encodeURIComponent(customerId)}`,
    { method: "DELETE" },
  );
}

/** Supplier default cost list (for purchase orders). */
export interface SupplierDefaultCostListRow {
  supplierId: string;
  supplierName?: string;
  supplierCode?: string;
  costListId: string;
  costListName?: string;
}

export async function fetchSupplierDefaultCostLists(opts?: {
  search?: string;
}): Promise<SupplierDefaultCostListRow[]> {
  requireLiveApi("Supplier default cost lists");
  const params = new URLSearchParams();
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  const res = await apiRequest<{ items: SupplierDefaultCostListRow[] }>(
    "/api/pricing/supplier-default-cost-lists",
    { params },
  );
  return res.items ?? [];
}

export async function setSupplierDefaultCostList(supplierId: string, costListId: string): Promise<void> {
  requireLiveApi("Set supplier default cost list");
  await apiRequest("/api/pricing/supplier-default-cost-lists", {
    method: "POST",
    body: { supplierId, costListId },
  });
}

export async function clearSupplierDefaultCostList(supplierId: string): Promise<void> {
  requireLiveApi("Clear supplier default cost list");
  await apiRequest(
    `/api/pricing/supplier-default-cost-lists/${encodeURIComponent(supplierId)}`,
    { method: "DELETE" },
  );
}

export async function fetchPriceListOptions(): Promise<PricingOption[]> {
  requireLiveApi("Price list options");
  const res = await apiRequest<{ items: Array<{ id: string; name: string }> }>("/api/pricing/price-lists");
  return (res.items ?? []).map((item) => ({ id: item.id, name: item.name }));
}

type PriceListApiItem = {
  id: string;
  name: string;
  code?: string;
  currency?: string;
  channel?: string;
  tier?: string;
  zoneId?: string;
  customerId?: string;
  franchiseId?: string;
  lastCalculatedAt?: string;
  updatedAt?: string;
  parentPriceListId?: string;
  parentName?: string;
  markupType?: "PERCENT" | "FLAT";
  markupValue?: number;
  items?: Array<{ productId: string; price: number; currency?: string }>;
};

function mapPriceListDetail(item: PriceListApiItem): PriceListDetail {
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    currency: item.currency ?? "KES",
    items: item.items ?? [],
    channel: item.channel,
    tier: item.tier,
    zoneId: item.zoneId,
    customerId: item.customerId,
    franchiseId: item.franchiseId,
    lastCalculatedAt: item.lastCalculatedAt,
    updatedAt: item.updatedAt,
    parentPriceListId: item.parentPriceListId,
    parentName: item.parentName,
    markupType: item.markupType,
    markupValue: item.markupValue,
  };
}

function mapPriceListForUi(d: PriceListDetail): PriceList {
  return {
    id: d.id,
    name: d.name,
    currency: d.currency ?? "KES",
    code: d.code,
    channel: resolveCatalogLabel(d.code, d.channel),
    pricingEngineChannel: d.channel,
    tier: d.tier,
    zoneId: d.zoneId,
    customerId: d.customerId,
    franchiseId: d.franchiseId,
    lastCalculatedAt: d.lastCalculatedAt,
    updatedAt: d.updatedAt,
    isDefault: false,
    parentPriceListId: d.parentPriceListId,
    parentName: d.parentName,
    markupType: d.markupType,
    markupValue: d.markupValue,
    pricedSkuCount: (d.items ?? []).filter((i) => i.price != null && Number(i.price) >= 0).length,
  };
}

export async function fetchPriceListsApi(): Promise<PriceListDetail[]> {
  requireLiveApi("Price lists");
  const res = await apiRequest<{ items: PriceListApiItem[] }>("/api/pricing/price-lists");
  return (res.items ?? []).map(mapPriceListDetail);
}

export type PriceListsPage = {
  items: PriceList[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
  totalCount?: number;
};

/** Paginated price lists / tags (backend search + limit/cursor). */
export async function fetchPriceListsPageForUi(opts?: {
  search?: string;
  limit?: number;
  cursor?: string;
}): Promise<PriceListsPage> {
  requireLiveApi("Price lists");
  const params = new URLSearchParams();
  const lim = opts?.limit != null && opts.limit > 0 ? Math.min(opts.limit, 100) : 25;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") params.set("cursor", opts.cursor);
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  const res = await apiRequest<{
    items: PriceListApiItem[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
    totalCount?: number;
  }>("/api/pricing/price-lists", { params });
  const items = (res.items ?? []).map((item) => mapPriceListForUi(mapPriceListDetail(item)));
  const limit = typeof res.limit === "number" ? res.limit : lim;
  const offset =
    typeof res.offset === "number"
      ? res.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : 0;
  const hasMore =
    typeof res.hasMore === "boolean" ? res.hasMore : items.length === limit && limit > 0;
  return {
    items,
    limit,
    offset,
    hasMore,
    nextCursor: res.nextCursor ?? (hasMore ? String(offset + items.length) : null),
    totalCount: typeof res.totalCount === "number" ? res.totalCount : undefined,
  };
}

/** Price lists as UI type (id, name, currency, channel). */
export async function fetchPriceListsForUi(): Promise<PriceList[]> {
  const list = await fetchPriceListsApi();
  return list.map(mapPriceListForUi);
}

export async function fetchPriceListByIdApi(id: string): Promise<PriceListDetail | null> {
  requireLiveApi("Price list by id");
  try {
    return await apiRequest<PriceListDetail>(`/api/pricing/price-lists/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export type CatalogPriceItem = {
  productId: string;
  sku?: string;
  barcode?: string;
  name: string;
  uom: string;
  price: number | null;
  /** FMCG: same as price (per piece). */
  pricePerPiece?: number | null;
  discountPercent?: number;
  packPrices?: Array<{ uom: string; unitsPer: number; unitPrice: number; unitPriceNet?: number }>;
  source: "price_list" | "product" | "none";
};

/** List prices from PriceList.items. FMCG responses include pricingMode=fmcg_piece + pack matrix. */
export async function fetchCatalogPricesApi(priceListId: string): Promise<{
  priceListId: string;
  priceListName: string;
  currency: string;
  pricingMode?: "fmcg_piece" | "flat";
  items: CatalogPriceItem[];
}> {
  requireLiveApi("Catalog prices");
  return apiRequest(`/api/pricing/price-lists/${encodeURIComponent(priceListId)}/catalog-prices`);
}

export async function resolveCustomerPriceListApi(partyId: string): Promise<{
  priceListId: string | null;
  source: "party" | "category" | "org" | "none";
  priceListName?: string;
}> {
  requireLiveApi("Resolve customer price list");
  const params = new URLSearchParams({ partyId });
  return apiRequest(`/api/pricing/resolve-customer-price-list?${params.toString()}`);
}

export async function createPriceListApi(body: {
  name: string;
  code?: string;
  currency?: string;
  items?: Array<{ productId: string; price: number; currency?: string; discountPercent?: number }>;
  parentPriceListId?: string;
  markupType?: "PERCENT" | "FLAT";
  markupValue?: number;
  channel?: string;
  tier?: string;
  zoneId?: string;
  customerId?: string;
  franchiseId?: string;
  isActive?: boolean;
}): Promise<{ id: string }> {
  requireLiveApi("Create price list");
  return apiRequest<{ id: string }>("/api/pricing/price-lists", { method: "POST", body });
}

export async function updatePriceListApi(
  id: string,
  body: Partial<{
    name: string;
    code?: string;
    currency: string;
    items: Array<{ productId: string; price: number; currency?: string; discountPercent?: number }>;
    parentPriceListId: string | null;
    markupType: "PERCENT" | "FLAT" | null;
    markupValue: number | null;
    channel: string | null;
    tier: string | null;
    zoneId: string | null;
    customerId: string | null;
    franchiseId: string | null;
    isActive: boolean;
  }>
): Promise<void> {
  requireLiveApi("Update price list");
  await apiRequest(`/api/pricing/price-lists/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

export async function deletePriceListApi(id: string): Promise<void> {
  requireLiveApi("Delete price list");
  await apiRequest(`/api/pricing/price-lists/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Daily prices ─────────────────────────────────────────────────────────────

export interface DailyPriceItem {
  productId: string;
  sku: string;
  name: string;
  uom: string;
  currency: string;
  /** Price set for the target date, null if not yet entered. */
  todayPrice: number | null;
  todayUpdatedAt: string | null;
  todayNotes: string | null;
  /** Most recent price from a prior day, used as fallback display. */
  fallbackPrice: number | null;
  fallbackDate: string | null;
  /** True when no price has been entered for the target date. */
  isStale: boolean;
  /** todayPrice if set, else inheritedPrice, else fallbackPrice. */
  effectivePrice: number | null;
  /** Price from parent zone/master list (when this list is derived). */
  inheritedPrice?: number | null;
  inheritedFromListId?: string | null;
  inheritedFromListName?: string | null;
  inheritedDate?: string | null;
  inheritedFromTargetDate?: boolean;
}

export interface DailyPriceListResponse {
  priceListId: string;
  priceListName: string;
  currency: string;
  channel?: string | null;
  franchiseId?: string | null;
  date: string;
  parentPriceListId?: string | null;
  parentPriceListName?: string | null;
  items: DailyPriceItem[];
  staleCount: number;
  totalCount: number;
}

export interface DailyPriceStatusList {
  priceListId: string;
  priceListName: string;
  totalProducts: number;
  pricedToday: number;
  staleCount: number;
  needsUpdate: boolean;
}

export interface DailyPriceStatusResponse {
  date: string;
  totalListsNeedingUpdate: number;
  lists: DailyPriceStatusList[];
}

export async function fetchDailyPricesApi(
  priceListId: string,
  date?: string
): Promise<DailyPriceListResponse> {
  requireLiveApi("Daily prices");
  const params = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiRequest<DailyPriceListResponse>(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices${params}`
  );
  return { ...res, items: sortProductsByFamilyThenName(res.items) };
}

export async function setDailyPriceApi(
  priceListId: string,
  productId: string,
  price: number,
  opts?: { date?: string; notes?: string }
): Promise<void> {
  requireLiveApi("Set daily price");
  await apiRequest(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices/${encodeURIComponent(productId)}`,
    { method: "PUT", body: { price, date: opts?.date, notes: opts?.notes } }
  );
}

export async function bulkSetDailyPricesApi(
  priceListId: string,
  items: Array<{ productId: string; price: number; notes?: string }>,
  date?: string
): Promise<void> {
  requireLiveApi("Bulk set daily prices");
  await apiRequest(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices`,
    { method: "PUT", body: { items, date } }
  );
}

export interface ZonePriceCascadeConflict {
  outletListId: string;
  outletListName: string;
  outletOrgId: string;
  outletName: string;
  productId: string;
  sku: string;
  productName: string;
  outletPrice: number;
  previousZonePrice: number | null;
  newZonePrice: number;
}

export async function previewZonePriceCascadeApi(
  priceListId: string,
  items: Array<{ productId: string; price: number }>,
  date?: string
): Promise<{ conflicts: ZonePriceCascadeConflict[] }> {
  requireLiveApi("Zone price cascade preview");
  return apiRequest(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices/cascade-preview`,
    { method: "POST", body: { items, date } }
  );
}

export async function applyZonePriceCascadeApi(
  priceListId: string,
  apply: Array<{ outletListId: string; productId: string }>,
  date?: string
): Promise<{ removed: number }> {
  requireLiveApi("Zone price cascade apply");
  return apiRequest(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices/cascade-apply`,
    { method: "POST", body: { apply, date } }
  );
}

export async function syncFranchisePublisherToOutletsApi(
  priceListId: string,
  items: Array<{ productId: string; price: number }>,
  date?: string
): Promise<{ zoneUpdated: number; outletOverridesRemoved: number }> {
  requireLiveApi("Sync franchise zone to outlets");
  return apiRequest(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices/sync-outlets`,
    { method: "POST", body: { items, date } }
  );
}

export async function fetchDailyPriceStatusApi(): Promise<DailyPriceStatusResponse> {
  requireLiveApi("Daily price status");
  return apiRequest<DailyPriceStatusResponse>("/api/pricing/daily-prices/status");
}
