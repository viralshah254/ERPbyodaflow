import { apiRequest, isApiConfigured } from "@/lib/api/client";

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
  if (!isApiConfigured()) {
    return { method: "WEIGHTED_AVERAGE", ranAt: null, updated: 0, totalValue: 0, items: [] };
  }
  return apiRequest<InventoryCostingSnapshot>("/api/inventory/costing/latest");
}

export async function fetchInventoryValuation(): Promise<InventoryValuationResponse> {
  if (!isApiConfigured()) {
    return { summary: [], rows: [] };
  }
  return apiRequest<InventoryValuationResponse>("/api/inventory/valuation");
}
