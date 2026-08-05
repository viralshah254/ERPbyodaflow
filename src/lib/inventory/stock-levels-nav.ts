export type StockLevelsNavOpts = {
  /** Open the Stock In sheet on arrival. */
  action?: "stockIn";
  productId?: string | null;
  warehouseId?: string | null;
  /** Pre-fill list search (SKU or product name). */
  search?: string | null;
};

/** Deep link into Inventory → Stock Levels (optional Stock In prefill). */
export function buildStockLevelsHref(opts: StockLevelsNavOpts = {}): string {
  const params = new URLSearchParams();
  if (opts.action) params.set("action", opts.action);
  if (opts.productId) params.set("productId", opts.productId);
  if (opts.warehouseId) params.set("warehouseId", opts.warehouseId);
  if (opts.search?.trim()) params.set("search", opts.search.trim());
  const q = params.toString();
  return q ? `/inventory/stock-levels?${q}` : "/inventory/stock-levels";
}
