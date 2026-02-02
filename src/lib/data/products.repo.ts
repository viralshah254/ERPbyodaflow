/**
 * Products repo: CRUD + localStorage overlay on mocks.
 */

import type { ProductRow } from "@/lib/mock/masters";
import type { ProductPackaging, ProductPrice } from "@/lib/products/pricing-types";
import type { ProductVariant, ProductAttributeDef } from "@/lib/products/types";
import { getMockProducts } from "@/lib/mock/masters";
import { getMockPackaging } from "@/lib/mock/products/packaging";
import { getMockProductPrices } from "@/lib/mock/products/pricing";
import { getMockVariants, getMockAttributeDefs } from "@/lib/mock/products/variants";

const KEY_PRODUCTS = "odaflow_products";
const KEY_PACKAGING = "odaflow_packaging";
const KEY_PRICING = "odaflow_pricing";
const KEY_VARIANTS = "odaflow_variants";
const KEY_ATTRIBUTE_DEFS = "odaflow_attribute_defs";

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

export function listProducts(): ProductRow[] {
  const stored = loadJson<ProductRow[]>(KEY_PRODUCTS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockProducts();
}

export function getProductById(id: string): ProductRow | undefined {
  return listProducts().find((p) => p.id === id);
}

export function createProduct(row: Omit<ProductRow, "id">): ProductRow {
  const list = listProducts();
  const id = `p${Date.now()}`;
  const created: ProductRow = { ...row, id };
  saveJson(KEY_PRODUCTS, [...list, created]);
  return created;
}

export function updateProduct(id: string, patch: Partial<ProductRow>): ProductRow | null {
  const list = listProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_PRODUCTS, next);
  return updated;
}

export function listPackaging(productId: string): ProductPackaging[] {
  const stored = loadJson<Record<string, ProductPackaging[]>>(KEY_PACKAGING);
  const override = stored?.[productId];
  if (override && Array.isArray(override)) return override;
  return getMockPackaging(productId);
}

export function savePackaging(productId: string, rows: ProductPackaging[]): void {
  const all = loadJson<Record<string, ProductPackaging[]>>(KEY_PACKAGING) ?? {};
  all[productId] = rows;
  saveJson(KEY_PACKAGING, all);
}

export function listProductPrices(productId?: string, priceListId?: string): ProductPrice[] {
  const stored = loadJson<ProductPrice[]>(KEY_PRICING);
  if (stored && Array.isArray(stored)) {
    let out = stored;
    if (productId) out = out.filter((p) => p.productId === productId);
    if (priceListId) out = out.filter((p) => p.priceListId === priceListId);
    return out;
  }
  return getMockProductPrices(productId, priceListId);
}

export function saveProductPrices(updates: ProductPrice[]): void {
  const existing = loadJson<ProductPrice[]>(KEY_PRICING) ?? getMockProductPrices();
  const byKey = new Map<string, ProductPrice>();
  existing.forEach((p) => byKey.set(`${p.productId}:${p.priceListId}`, p));
  updates.forEach((p) => byKey.set(`${p.productId}:${p.priceListId}`, p));
  saveJson(KEY_PRICING, Array.from(byKey.values()));
}

export function listVariants(productId: string): ProductVariant[] {
  const stored = loadJson<Record<string, ProductVariant[]>>(KEY_VARIANTS);
  const override = stored?.[productId];
  if (override && Array.isArray(override)) return override;
  return getMockVariants(productId);
}

export function getVariantById(variantId: string): ProductVariant | undefined {
  const products = listProducts();
  for (const p of products) {
    const v = listVariants(p.id).find((x) => x.id === variantId);
    if (v) return v;
  }
  return undefined;
}

export function saveVariants(productId: string, rows: ProductVariant[]): void {
  const all = loadJson<Record<string, ProductVariant[]>>(KEY_VARIANTS) ?? {};
  all[productId] = rows;
  saveJson(KEY_VARIANTS, all);
}

export function createVariant(productId: string, row: Omit<ProductVariant, "id" | "productId">): ProductVariant {
  const list = listVariants(productId);
  const id = `v${Date.now()}`;
  const created: ProductVariant = { ...row, id, productId };
  saveVariants(productId, [...list, created]);
  return created;
}

export function updateVariant(productId: string, variantId: string, patch: Partial<ProductVariant>): ProductVariant | null {
  const list = listVariants(productId);
  const idx = list.findIndex((v) => v.id === variantId);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveVariants(productId, next);
  return updated;
}

export function deleteVariant(productId: string, variantId: string): boolean {
  const next = listVariants(productId).filter((v) => v.id !== variantId);
  if (next.length === listVariants(productId).length) return false;
  saveVariants(productId, next);
  return true;
}

export function listAttributeDefs(): ProductAttributeDef[] {
  const stored = loadJson<ProductAttributeDef[]>(KEY_ATTRIBUTE_DEFS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockAttributeDefs();
}

export function saveAttributeDefs(rows: ProductAttributeDef[]): void {
  saveJson(KEY_ATTRIBUTE_DEFS, rows);
}

export function resetProductsFromMocks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_PRODUCTS);
    localStorage.removeItem(KEY_PACKAGING);
    localStorage.removeItem(KEY_PRICING);
    localStorage.removeItem(KEY_VARIANTS);
    localStorage.removeItem(KEY_ATTRIBUTE_DEFS);
  } catch {
    /* ignore */
  }
}
