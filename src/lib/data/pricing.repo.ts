/**
 * Pricing repo: price lists, customer overrides, discount policies (stub).
 * Product-tier pricing lives in products.repo (listProductPrices, saveProductPrices).
 */

import type { PriceList, CustomerPriceOverride, DiscountPolicy } from "@/lib/products/pricing-types";
import { getMockPriceLists } from "@/lib/mock/products/price-lists";

const KEY_PRICE_LISTS = "odaflow_price_lists";
const KEY_CUSTOMER_OVERRIDES = "odaflow_customer_price_overrides";
const KEY_DISCOUNT_POLICIES = "odaflow_discount_policies";

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function listPriceLists(): PriceList[] {
  const stored = loadJson<PriceList[]>(KEY_PRICE_LISTS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockPriceLists();
}

export function getPriceListById(id: string): PriceList | undefined {
  return listPriceLists().find((pl) => pl.id === id);
}

export function createPriceList(row: Omit<PriceList, "id">): PriceList {
  const list = listPriceLists();
  const id = `pl-${Date.now()}`;
  const created: PriceList = { ...row, id };
  saveJson(KEY_PRICE_LISTS, [...list, created]);
  return created;
}

export function updatePriceList(id: string, patch: Partial<PriceList>): PriceList | null {
  const list = listPriceLists();
  const idx = list.findIndex((pl) => pl.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_PRICE_LISTS, next);
  return updated;
}

export function deletePriceList(id: string): boolean {
  const next = listPriceLists().filter((pl) => pl.id !== id);
  if (next.length === listPriceLists().length) return false;
  saveJson(KEY_PRICE_LISTS, next);
  return true;
}

export function listCustomerOverrides(customerId?: string, productId?: string): CustomerPriceOverride[] {
  const list = loadJson<CustomerPriceOverride[]>(KEY_CUSTOMER_OVERRIDES);
  let out = (list && Array.isArray(list)) ? list : [];
  if (customerId) out = out.filter((o) => o.customerId === customerId);
  if (productId) out = out.filter((o) => o.productId === productId);
  return out;
}

export function saveCustomerOverride(override: CustomerPriceOverride): void {
  const list = loadJson<CustomerPriceOverride[]>(KEY_CUSTOMER_OVERRIDES) ?? [];
  const next = list.filter((o) => o.id !== override.id);
  next.push(override);
  saveJson(KEY_CUSTOMER_OVERRIDES, next);
}

export function deleteCustomerOverride(id: string): void {
  const next = listCustomerOverrides().filter((o) => o.id !== id);
  saveJson(KEY_CUSTOMER_OVERRIDES, next);
}

export function listDiscountPolicies(): DiscountPolicy[] {
  const stored = loadJson<DiscountPolicy[]>(KEY_DISCOUNT_POLICIES);
  if (stored && Array.isArray(stored)) return stored;
  return [
    { id: "dp1", name: "Volume 10%", type: "volume", requiresApproval: true },
    { id: "dp2", name: "Promo Q1", type: "promo", requiresApproval: false, startDate: "2025-01-01", endDate: "2025-03-31" },
  ];
}

export function saveDiscountPolicy(policy: DiscountPolicy): void {
  const list = listDiscountPolicies();
  const idx = list.findIndex((p) => p.id === policy.id);
  const next = idx >= 0 ? [...list] : [...list, policy];
  if (idx >= 0) next[idx] = policy;
  else next[next.length - 1] = { ...policy, id: policy.id || `dp${Date.now()}` };
  saveJson(KEY_DISCOUNT_POLICIES, next);
}

export function resetPricingFromMocks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_PRICE_LISTS);
    localStorage.removeItem(KEY_CUSTOMER_OVERRIDES);
    localStorage.removeItem(KEY_DISCOUNT_POLICIES);
  } catch {
    /* ignore */
  }
}
