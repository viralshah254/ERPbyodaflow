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
