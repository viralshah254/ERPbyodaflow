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
    quantity: number;
    unitCost: number;
    inventoryValue: number;
  }>;
};

export async function fetchLatestInventoryCosting(): Promise<InventoryCostingSnapshot> {
  requireLiveApi("Latest inventory costing");
  return apiRequest<InventoryCostingSnapshot>("/api/inventory/costing/latest");
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
