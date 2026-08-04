import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type InventoryCostingSnapshot = {
  method: string;
  ranAt: string | null;
  updated: number;
  totalValue: number;
  items: Array<{
    stockLevelId: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    unitCost: number;
    inventoryValue: number;
  }>;
};

export type InventoryValuationResponse = {
  /** ISO timestamp of the costing run that produced this snapshot; null if none. */
  ranAt: string | null;
  method: string | null;
  summary: Array<{
    warehouseId: string;
    warehouse: string;
    skuCount: number;
    totalQty: number;
    totalValue: number;
  }>;
  rows: Array<{
    stockLevelId: string;
    productId: string;
    sku: string;
    productName: string;
    warehouseId: string;
    warehouseName?: string;
    quantity: number;
    unitCost: number;
    inventoryValue: number;
  }>;
};

export async function fetchLatestInventoryCosting(): Promise<InventoryCostingSnapshot> {
  requireLiveApi("Latest inventory costing");
  return apiRequest<InventoryCostingSnapshot>("/api/inventory/costing/latest");
}

export type InventoryValuationPageResponse = InventoryValuationResponse & {
  total?: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

export async function fetchInventoryValuationPage(params?: {
  limit?: number;
  cursor?: string;
  search?: string;
}): Promise<{
  ranAt: string | null;
  method: string | null;
  summary: InventoryValuationResponse["summary"];
  rows: InventoryValuationResponse["rows"];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
}> {
  requireLiveApi("Inventory valuation");
  const lim = params?.limit != null ? Math.min(Math.max(params.limit, 1), 100) : 25;
  const qs = new URLSearchParams();
  qs.set("limit", String(lim));
  if (params?.cursor) qs.set("cursor", params.cursor);
  if (params?.search?.trim()) qs.set("search", params.search.trim());
  const payload = await apiRequest<InventoryValuationPageResponse>("/api/inventory/valuation", { params: qs });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const offset =
    typeof payload.offset === "number" ? payload.offset : params?.cursor ? Number(params.cursor) || 0 : 0;
  const rows = payload.rows ?? [];
  const total = typeof payload.total === "number" ? payload.total : rows.length;
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : offset + rows.length < total;
  return {
    ranAt: payload.ranAt,
    method: payload.method,
    summary: payload.summary ?? [],
    rows,
    total,
    limit,
    offset,
    hasMore,
    nextCursor: payload.nextCursor ?? (hasMore ? String(offset + rows.length) : null),
  };
}

export async function fetchInventoryValuation(): Promise<InventoryValuationResponse> {
  requireLiveApi("Inventory valuation");
  return apiRequest<InventoryValuationResponse>("/api/inventory/valuation");
}

export async function runInventoryCostingApi(): Promise<void> {
  requireLiveApi("Inventory costing run");
  await apiRequest("/api/inventory/costing/run", {
    method: "POST",
    body: {},
  });
}

/** FIFO-style remaining layers (GRN-derived) for batch / average cost drill-down. */
export type ProductCostLayersBatchRow = {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  lineValue: number;
  sourceType: string;
  reference?: string;
  grnId?: string | null;
  date: string;
  currency: string;
};

export type ProductCostLayersResponse = {
  currency: string;
  totalQty: number;
  averageUnitCost: number;
  totalInventoryValue: number;
  fifoMatchesStock: boolean;
  stockLevelQty: number;
  warehouses: Array<{ warehouseId: string; warehouseName: string; qty: number }>;
  batches: ProductCostLayersBatchRow[];
};

export async function fetchProductCostLayers(productId: string): Promise<ProductCostLayersResponse> {
  requireLiveApi("Inventory cost batches");
  return apiRequest<ProductCostLayersResponse>(
    `/api/inventory/product-cost-layers/${encodeURIComponent(productId)}`
  );
}
