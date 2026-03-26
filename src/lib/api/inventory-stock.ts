import {
  type StockRow,
  type MovementRow,
} from "@/lib/types/inventory";
import { apiRequest, requireLiveApi } from "./client";

export type InventoryStockRow = StockRow & { productId?: string };

type BackendStockLevel = {
  id: string;
  productId: string;
  sku?: string;
  name: string;
  uom?: string;
  packSizeKg?: number | null;
  warehouseId: string;
  warehouse: string;
  location?: string;
  onHand?: number;
  quantity?: number;
  reserved?: number;
  reservedQuantity?: number;
  available: number;
  reorderLevel: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

function mapStatus(status: BackendStockLevel["status"]): StockRow["status"] {
  if (status === "OUT_OF_STOCK") return "Out of Stock";
  if (status === "LOW_STOCK") return "Low Stock";
  return "In Stock";
}

function mapStock(item: BackendStockLevel): InventoryStockRow {
  return {
    id: item.id,
    productId: item.productId,
    sku: item.sku ?? item.productId,
    name: item.name,
    warehouse: item.warehouse,
    warehouseId: item.warehouseId,
    location: item.location,
    quantity: item.onHand ?? item.quantity ?? 0,
    reserved: item.reserved ?? item.reservedQuantity ?? 0,
    available: item.available,
    reorderLevel: item.reorderLevel,
    status: mapStatus(item.status),
    uom: item.uom,
    packSizeKg: item.packSizeKg ?? null,
  };
}

export async function fetchStockLevelsApi(filters?: {
  warehouseId?: string;
  productId?: string;
  status?: "In Stock" | "Low Stock" | "Out of Stock" | "all";
  search?: string;
}): Promise<InventoryStockRow[]> {
  requireLiveApi("Inventory stock levels");
  const statusMap: Record<string, string | undefined> = {
    "In Stock": "IN_STOCK",
    "Low Stock": "LOW_STOCK",
    "Out of Stock": "OUT_OF_STOCK",
    all: undefined,
  };
  const params = new URLSearchParams();
  if (filters?.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters?.productId) params.set("productId", filters.productId);
  if (filters?.status) {
    const mappedStatus = statusMap[filters.status];
    if (mappedStatus) params.set("status", mappedStatus);
  }
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  const data = await apiRequest<{ items: BackendStockLevel[] }>("/api/inventory/stock-levels", {
    params,
  });
  return data.items.map(mapStock);
}

export async function fetchStockLevelApi(id: string): Promise<InventoryStockRow | null> {
  requireLiveApi("Inventory stock level detail");
  const data = await apiRequest<BackendStockLevel>(`/api/inventory/stock-levels/${id}`);
  return mapStock(data);
}

export async function createStockAdjustmentApi(payload: {
  stockLevelId: string;
  quantityDelta: number;
  reason?: string;
}): Promise<void> {
  requireLiveApi("Inventory stock adjustment");
  await apiRequest("/api/inventory/stock-adjustments", {
    method: "POST",
    body: {
      reason: payload.reason,
      lines: [{ stockLevelId: payload.stockLevelId, quantityDelta: payload.quantityDelta }],
    },
  });
}

type BackendInventoryMovement = {
  id: string;
  date: string;
  direction: "IN" | "OUT";
  signedQuantity?: number;
  sku?: string;
  name?: string;
  warehouse: string;
  sourceType?: string;
  reference?: string;
};

export async function fetchInventoryMovementsApi(filters?: {
  warehouseId?: string;
  search?: string;
  type?: string;
}): Promise<MovementRow[]> {
  requireLiveApi("Inventory movements");
  const params = new URLSearchParams();
  if (filters?.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  const data = await apiRequest<{ items: BackendInventoryMovement[] }>("/api/inventory/movements", {
    params,
  });
  let rows = data.items.map((item) => ({
    id: item.id,
    date: item.date,
    type:
      item.sourceType === "TRANSFER"
        ? "TRANSFER"
        : item.sourceType === "ADJUSTMENT"
          ? "ADJUST"
          : item.direction,
    sku: item.sku ?? "—",
    productName: item.name ?? "Unknown product",
    warehouse: item.warehouse,
    quantity: item.signedQuantity ?? 0,
    reference: item.reference,
  })) as MovementRow[];
  if (filters?.type) rows = rows.filter((row) => row.type === filters.type);
  return rows;
}
