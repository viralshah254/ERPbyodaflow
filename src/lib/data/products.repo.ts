/**
 * Products repo: in-memory cache only. Use fetchProductsApi for list/get; call setProductsCache after fetch
 * so listProducts/getProductById stay in sync. Packaging, pricing, variants, attributes are served from API (product-master).
 */

import type { ProductRow } from "@/lib/types/masters";
import { fetchProductsApi, fetchProductsPageApi } from "@/lib/api/products";

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
 * Typed searches go to the server. FMCG line-by-line entry loads later pages
 * as the open list is scrolled.
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

/** Rows per request on the inline sales sheet. More load as the clerk scrolls. */
export const FINISHED_GOODS_PAGE_SIZE = 10;

/**
 * One page of the inline sales catalogue in item-code order, optionally restricted to the finished-goods role.
 * `nextCursor` is null on the last page.
 */
export async function fetchFinishedGoodsPage(opts: {
  finishedGoodsOnly?: boolean;
  cursor?: string | null;
  search?: string;
  limit?: number;
} = {}): Promise<{ items: ProductRow[]; nextCursor: string | null }> {
  const result = await fetchProductsPageApi({
    status: "ACTIVE",
    ...(opts.finishedGoodsOnly ? { itemRole: "FINISHED" as const } : {}),
    sellable: true,
    search: opts.search,
    limit: opts.limit ?? FINISHED_GOODS_PAGE_SIZE,
    cursor: opts.cursor ?? "0",
    includeStock: false,
    sortBy: "itemCode",
  });
  const nextCursor = result.hasMore ? result.nextCursor : null;
  if (nextCursor != null && nextCursor === (opts.cursor ?? "0")) throw new Error("Product catalogue pagination did not advance.");
  return {
    items: result.items.filter((row) => !opts.finishedGoodsOnly || row.itemRole === "FINISHED"),
    nextCursor,
  };
}

/**
 * One numbered page of what a bakery receives on a GRN: raw materials and packaging, never finished goods.
 * `total` is the number of matching rows, so the caller can show page numbers.
 */
export async function fetchReceivableProductsPage(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: ProductRow[]; total: number }> {
  const pageSize = Math.min(Math.max(Math.floor(opts.pageSize) || 10, 1), 100);
  const page = Math.max(Math.floor(opts.page) || 1, 1);
  const result = await fetchProductsPageApi({
    status: "ACTIVE",
    itemRoles: ["RAW", "PACKAGING"],
    search: opts.search,
    limit: pageSize,
    cursor: String((page - 1) * pageSize),
    includeStock: false,
    includeTotal: true,
  });
  return { items: result.items, total: result.total ?? (page - 1) * pageSize + result.items.length };
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
