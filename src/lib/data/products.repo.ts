/**
 * Products repo: in-memory cache only. Use fetchProductsApi for list/get; call setProductsCache after fetch
 * so listProducts/getProductById stay in sync. Packaging, pricing, variants, attributes are served from API (product-master).
 */

import type { ProductRow } from "@/lib/types/masters";
import { fetchProductsApi } from "@/lib/api/products";

let productsCache: ProductRow[] = [];

/** Set in-memory product list (e.g. after fetchProductsApi()) so listProducts/getProductById stay in sync. */
export function setProductsCache(rows: ProductRow[]): void {
  productsCache = rows;
}

export function listProducts(): ProductRow[] {
  return productsCache;
}

/** Fetch products filtered by purchasable (for purchase orders) or sellable (for sales orders). */
export async function fetchProductsForDocumentLines(
  filter: "purchasable" | "sellable" | "all"
): Promise<ProductRow[]> {
  if (filter === "all") {
    return fetchProductsApi();
  }
  return fetchProductsApi({
    purchasable: filter === "purchasable",
    sellable: filter === "sellable",
  });
}

/** Hydrate products cache from API; call from pages that need listProducts() to reflect live data. */
export async function hydrateProductsFromApi(): Promise<ProductRow[]> {
  const rows = await fetchProductsApi();
  setProductsCache(rows);
  return rows;
}

export function getProductById(id: string): ProductRow | undefined {
  return productsCache.find((p) => p.id === id);
}
