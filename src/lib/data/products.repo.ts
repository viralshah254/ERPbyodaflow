/**
 * Products repo: in-memory cache only. Use fetchProductsApi for list/get; call setProductsCache after fetch
 * so listProducts/getProductById stay in sync. Packaging, pricing, variants, attributes are served from API (product-master).
 */

import type { ProductRow } from "@/lib/types/masters";
import { fetchProductsApi, fetchProductsPageApi } from "@/lib/api/products";
import { numericItemCodeSort } from "@/lib/products/item-code";

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

/**
 * Fetch the first page (up to 100) of products for document line pickers.
 * A single page is enough to populate the initial dropdown; subsequent typed
 * searches go to the server via `loadProductOptions` in DocumentLineEditor.
 */
export async function fetchProductsForDocumentLines(
  filter: "purchasable" | "sellable" | "all"
): Promise<ProductRow[]> {
  const opts =
    filter === "all"
      ? { limit: 100 as const, includeStock: false as const }
      : {
          purchasable: filter === "purchasable",
          sellable: filter === "sellable",
          limit: 100 as const,
          includeStock: false as const,
        };
  const { items } = await fetchProductsPageApi(opts);
  return items;
}

/** Every active finished good with a numeric item code, in code order. */
export async function fetchAllNumericFinishedGoods(): Promise<ProductRow[]> {
  const rows: ProductRow[] = [];
  let cursor: string | null = "0";
  for (let page = 0; page < 20; page += 1) {
    const result = await fetchProductsPageApi({
      numericItemCode: true,
      status: "ACTIVE",
      sellable: true,
      limit: 100,
      cursor: cursor ?? "0",
      includeStock: false,
    });
    rows.push(...result.items);
    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return rows.sort(
    (a, b) => numericItemCodeSort(a) - numericItemCodeSort(b) || a.name.localeCompare(b.name)
  );
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
