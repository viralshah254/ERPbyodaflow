/**
 * Products repo: in-memory cache only. Use fetchProductsApi for list/get; call setProductsCache after fetch
 * so listProducts/getProductById stay in sync. Packaging, pricing, variants, attributes are served from API (product-master).
 */

import type { ProductRow } from "@/lib/types/masters";
import { fetchProductsApi } from "@/lib/api/products";

let productsCache: ProductRow[] = [];
const cacheListeners = new Set<() => void>();

function emitProductsCache(): void {
  cacheListeners.forEach((l) => l());
}

/**
 * Subscribe to in-memory product cache updates (after hydrate / setProductsCache).
 * Used by document line editor so rows re-read listProducts() when the cache refreshes.
 */
export function subscribeProductsCache(onStoreChange: () => void): () => void {
  cacheListeners.add(onStoreChange);
  return () => cacheListeners.delete(onStoreChange);
}

/** Set in-memory product list (e.g. after fetchProductsApi()) so listProducts/getProductById stay in sync. */
export function setProductsCache(rows: ProductRow[]): void {
  productsCache = rows;
  emitProductsCache();
}

export function listProducts(): ProductRow[] {
  return productsCache;
}

/** Fetch products filtered by purchasable (for purchase orders) or sellable (for sales orders). */
export async function fetchProductsForDocumentLines(
  filter: "purchasable" | "sellable" | "all"
): Promise<ProductRow[]> {
  if (filter === "all") {
    return fetchProductsApi({ limit: 100 });
  }
  return fetchProductsApi({
    purchasable: filter === "purchasable",
    sellable: filter === "sellable",
    limit: 100,
  });
}

/** Hydrate products cache from API; call from pages that need listProducts() to reflect live data. */
export async function hydrateProductsFromApi(): Promise<ProductRow[]> {
  const rows = await fetchProductsApi({ limit: 100 });
  setProductsCache(rows);
  return rows;
}

export function getProductById(id: string): ProductRow | undefined {
  return productsCache.find((p) => p.id === id);
}
