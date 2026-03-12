/**
 * Pricing rules API — discount policies and customer default price lists.
 * When NEXT_PUBLIC_API_URL is set, requests go to the backend; otherwise mocks/repo.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import type { DiscountPolicy } from "@/lib/products/pricing-types";
import { listDiscountPolicies, saveDiscountPolicy } from "@/lib/data/pricing.repo";
import { getMockPriceLists } from "@/lib/mock/products/price-lists";

/** Customer default price list assignment (API shape). */
export interface CustomerDefaultPriceListRow {
  customerId: string;
  customerName?: string;
  priceListId: string;
  priceListName?: string;
  customerCurrency?: string;
  paymentTermsId?: string;
}

export interface PricingOption {
  id: string;
  name: string;
}

// ——— Discount policies ———

export async function fetchDiscountPolicies(): Promise<DiscountPolicy[]> {
  if (!isApiConfigured()) return listDiscountPolicies();
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
  if (!isApiConfigured()) throw new Error("STUB");
  const res = await apiRequest<DiscountPolicy>("/api/pricing/policies", { method: "POST", body });
  return res;
}

export async function updateDiscountPolicy(
  id: string,
  body: Partial<{ name: string; type: string; requiresApproval: boolean; startDate: string; endDate: string }>
): Promise<DiscountPolicy> {
  if (!isApiConfigured()) throw new Error("STUB");
  return apiRequest<DiscountPolicy>(`/api/pricing/policies/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

/** Request approval for a policy (optional workflow). */
export async function requestPolicyApproval(id: string, comment?: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`/api/pricing/policies/${encodeURIComponent(id)}/request-approval`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

// ——— Customer default price list ———

export async function fetchCustomerDefaultPriceLists(): Promise<CustomerDefaultPriceListRow[]> {
  if (!isApiConfigured()) return [];
  const res = await apiRequest<{ items: CustomerDefaultPriceListRow[] }>("/api/pricing/customer-default-price-lists");
  return res.items ?? [];
}

export async function setCustomerDefaultPriceList(customerId: string, priceListId: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest("/api/pricing/customer-default-price-lists", {
    method: "POST",
    body: { customerId, priceListId },
  });
}

/** List price lists (for dropdowns). Uses repo/mock when API not configured. */
export function getPriceListsForConfig(): { id: string; name: string }[] {
  return getMockPriceLists().map((pl) => ({ id: pl.id, name: pl.name }));
}

export async function fetchPriceListOptions(): Promise<PricingOption[]> {
  if (!isApiConfigured()) return getPriceListsForConfig();
  const res = await apiRequest<{ items: Array<{ id: string; name: string }> }>("/api/pricing/price-lists");
  return (res.items ?? []).map((item) => ({ id: item.id, name: item.name }));
}
