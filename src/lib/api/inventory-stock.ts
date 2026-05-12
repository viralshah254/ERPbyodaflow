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
  productFamily?: string | null;
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
    productFamily: item.productFamily ?? undefined,
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
  /** Server caps at 100; default 50 when omitted. */
  limit?: number;
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
  if (filters?.limit != null && filters.limit > 0) {
    params.set("limit", String(Math.min(filters.limit, 100)));
  }
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

// ─── Franchise network stock aggregate ───────────────────────────────────────

export type FranchiseOutletStockRow = {
  childOrgId: string;
  outletName: string;
  warehouseId: string;
  warehouseName: string;
  qty: number;
  reserved: number;
  available: number;
};

export type FranchiseNetworkStockItem = {
  productId: string;
  sku: string;
  productName: string;
  totalQty: number;
  totalReserved: number;
  totalAvailable: number;
  unitCostKes: number;
  networkValueKes: number;
  byOutlet: FranchiseOutletStockRow[];
};

export type FranchiseNetworkStockAggregate = {
  items: FranchiseNetworkStockItem[];
  costingRanAt: string | null;
};

export async function fetchFranchiseNetworkStockAggregate(filters?: {
  search?: string;
  productId?: string;
}): Promise<FranchiseNetworkStockAggregate> {
  requireLiveApi("Franchise network stock aggregate");
  const params = new URLSearchParams();
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.productId) params.set("productId", filters.productId);
  return apiRequest<FranchiseNetworkStockAggregate>("/api/franchise/network/stock-aggregate", {
    params,
  });
}

// ─── Inventory movements ──────────────────────────────────────────────────────

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
