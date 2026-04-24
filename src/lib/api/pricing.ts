/**
 * Pricing rules API — discount policies and customer default price lists.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { DiscountPolicy, PriceList } from "@/lib/products/pricing-types";

/** Customer default price list assignment (API shape). */
export interface CustomerDefaultPriceListRow {
  customerId: string;
  customerName?: string;
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
  }>;
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

export async function fetchCustomerDefaultPriceLists(): Promise<CustomerDefaultPriceListRow[]> {
  requireLiveApi("Customer default price lists");
  const res = await apiRequest<{ items: CustomerDefaultPriceListRow[] }>("/api/pricing/customer-default-price-lists");
  return res.items ?? [];
}

export async function setCustomerDefaultPriceList(customerId: string, priceListId: string): Promise<void> {
  requireLiveApi("Set customer default price list");
  await apiRequest("/api/pricing/customer-default-price-lists", {
    method: "POST",
    body: { customerId, priceListId },
  });
}

/** Supplier default cost list (for purchase orders). */
export interface SupplierDefaultCostListRow {
  supplierId: string;
  supplierName?: string;
  costListId: string;
  costListName?: string;
}

export async function fetchSupplierDefaultCostLists(): Promise<SupplierDefaultCostListRow[]> {
  requireLiveApi("Supplier default cost lists");
  const res = await apiRequest<{ items: SupplierDefaultCostListRow[] }>("/api/pricing/supplier-default-cost-lists");
  return res.items ?? [];
}

export async function setSupplierDefaultCostList(supplierId: string, costListId: string): Promise<void> {
  requireLiveApi("Set supplier default cost list");
  await apiRequest("/api/pricing/supplier-default-cost-lists", {
    method: "POST",
    body: { supplierId, costListId },
  });
}

export async function fetchPriceListOptions(): Promise<PricingOption[]> {
  requireLiveApi("Price list options");
  const res = await apiRequest<{ items: Array<{ id: string; name: string }> }>("/api/pricing/price-lists");
  return (res.items ?? []).map((item) => ({ id: item.id, name: item.name }));
}

export async function fetchPriceListsApi(): Promise<PriceListDetail[]> {
  requireLiveApi("Price lists");
  const res = await apiRequest<{
    items: Array<{
      id: string;
      name: string;
      code?: string;
      currency?: string;
      items?: Array<{ productId: string; price: number; currency?: string }>;
    }>;
  }>("/api/pricing/price-lists");
  return (res.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    currency: item.currency ?? "KES",
    items: item.items ?? [],
  }));
}

/** Price lists as UI type (id, name, currency, channel). */
export async function fetchPriceListsForUi(): Promise<PriceList[]> {
  const list = await fetchPriceListsApi();
  return list.map((d) => ({
    id: d.id,
    name: d.name,
    currency: d.currency ?? "KES",
    channel: d.code ?? "Retail",
    isDefault: false,
    parentPriceListId: (d as unknown as { parentPriceListId?: string }).parentPriceListId,
    parentName: (d as unknown as { parentName?: string }).parentName,
    markupType: (d as unknown as { markupType?: "PERCENT" | "FLAT" }).markupType,
    markupValue: (d as unknown as { markupValue?: number }).markupValue,
  }));
}

export async function fetchPriceListByIdApi(id: string): Promise<PriceListDetail | null> {
  requireLiveApi("Price list by id");
  try {
    return await apiRequest<PriceListDetail>(`/api/pricing/price-lists/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createPriceListApi(body: {
  name: string;
  code?: string;
  currency?: string;
  items?: Array<{ productId: string; price: number; currency?: string }>;
  parentPriceListId?: string;
  markupType?: "PERCENT" | "FLAT";
  markupValue?: number;
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
    items: Array<{ productId: string; price: number; currency?: string }>;
    parentPriceListId: string | null;
    markupType: "PERCENT" | "FLAT" | null;
    markupValue: number | null;
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
  /** todayPrice if set, else fallbackPrice. */
  effectivePrice: number | null;
}

export interface DailyPriceListResponse {
  priceListId: string;
  priceListName: string;
  currency: string;
  date: string;
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
  return apiRequest<DailyPriceListResponse>(
    `/api/pricing/price-lists/${encodeURIComponent(priceListId)}/daily-prices${params}`
  );
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

export async function fetchDailyPriceStatusApi(): Promise<DailyPriceStatusResponse> {
  requireLiveApi("Daily price status");
  return apiRequest<DailyPriceStatusResponse>("/api/pricing/daily-prices/status");
}
