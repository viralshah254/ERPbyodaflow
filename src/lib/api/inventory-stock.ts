import {
  type StockRow,
  type MovementRow,
} from "@/lib/types/inventory";
import { apiRequest, requireLiveApi } from "./client";

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
  ownership?: "CoolCatch" | "Franchise";
  ageDays?: number;
  lastMovementAt?: string;
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
    ownership: item.ownership,
    ageDays: item.ageDays,
    lastMovementAt: item.lastMovementAt,
  };
}

export type InventoryStockRow = StockRow & {
  productId?: string;
  ownership?: "CoolCatch" | "Franchise";
  ageDays?: number;
  lastMovementAt?: string;
};

export type FetchStockLevelsPageOpts = {
  limit?: number;
  cursor?: string;
  warehouseId?: string;
  productId?: string;
  status?: "In Stock" | "Low Stock" | "Out of Stock" | "all";
  search?: string;
  ownership?: "all" | "CoolCatch" | "Franchise";
  minOnHand?: number;
  maxOnHand?: number;
  minAvailable?: number;
  maxAvailable?: number;
  minAgeDays?: number;
  maxAgeDays?: number;
};

export type FetchStockLevelsPageResult = {
  items: InventoryStockRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

function stockLevelQueryParams(filters?: FetchStockLevelsPageOpts): URLSearchParams {
  const statusMap: Record<string, string | undefined> = {
    "In Stock": "IN_STOCK",
    "Low Stock": "LOW_STOCK",
    "Out of Stock": "OUT_OF_STOCK",
    all: undefined,
  };
  const params = new URLSearchParams();
  const lim = filters?.limit != null ? Math.min(Math.max(filters.limit, 1), 100) : 25;
  params.set("limit", String(lim));
  if (filters?.cursor != null && filters.cursor !== "") {
    params.set("cursor", filters.cursor);
  }
  if (filters?.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters?.productId) params.set("productId", filters.productId);
  if (filters?.status) {
    const mappedStatus = statusMap[filters.status];
    if (mappedStatus) params.set("status", mappedStatus);
  }
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.ownership && filters.ownership !== "all") {
    params.set("ownership", filters.ownership);
  }
  if (filters?.minOnHand != null) params.set("minOnHand", String(filters.minOnHand));
  if (filters?.maxOnHand != null) params.set("maxOnHand", String(filters.maxOnHand));
  if (filters?.minAvailable != null) params.set("minAvailable", String(filters.minAvailable));
  if (filters?.maxAvailable != null) params.set("maxAvailable", String(filters.maxAvailable));
  if (filters?.minAgeDays != null) params.set("minAgeDays", String(filters.minAgeDays));
  if (filters?.maxAgeDays != null) params.set("maxAgeDays", String(filters.maxAgeDays));
  return params;
}

export async function fetchStockLevelsPageApi(
  filters?: FetchStockLevelsPageOpts,
): Promise<FetchStockLevelsPageResult> {
  requireLiveApi("Inventory stock levels");
  const lim = filters?.limit != null ? Math.min(Math.max(filters.limit, 1), 100) : 25;
  const params = stockLevelQueryParams(filters);
  const data = await apiRequest<{
    items: BackendStockLevel[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/inventory/stock-levels", { params });
  const limit = typeof data.limit === "number" ? data.limit : lim;
  const parsedOffset =
    typeof data.offset === "number"
      ? data.offset
      : filters?.cursor != null && filters.cursor !== ""
        ? Number(filters.cursor) || 0
        : 0;
  const items = (data.items ?? []).map(mapStock);
  const hasMore =
    typeof data.hasMore === "boolean"
      ? data.hasMore
      : items.length === limit && limit > 0;
  let nextCursor: string | null;
  if (
    data.nextCursor !== undefined &&
    data.nextCursor !== null &&
    String(data.nextCursor) !== ""
  ) {
    nextCursor = String(data.nextCursor);
  } else if (hasMore) {
    nextCursor = String(parsedOffset + items.length);
  } else {
    nextCursor = null;
  }
  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

export async function fetchStockLevelsApi(filters?: {
  warehouseId?: string;
  productId?: string;
  status?: "In Stock" | "Low Stock" | "Out of Stock" | "all";
  search?: string;
  limit?: number;
}): Promise<InventoryStockRow[]> {
  const rows: InventoryStockRow[] = [];
  let cursor: string | undefined;
  const pageLimit = filters?.limit != null ? Math.min(filters.limit, 100) : 100;
  while (rows.length < 500) {
    const page = await fetchStockLevelsPageApi({ ...filters, limit: pageLimit, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
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
  total?: number;
  totals?: {
    totalAvailable: number;
    networkValueKes: number;
  };
};

export async function fetchFranchiseNetworkStockAggregatePage(filters?: {
  search?: string;
  productId?: string;
  limit?: number;
  cursor?: string;
}): Promise<{
  items: FranchiseNetworkStockItem[];
  costingRanAt: string | null;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
  totals: { totalAvailable: number; networkValueKes: number };
}> {
  requireLiveApi("Franchise network stock aggregate");
  const lim = filters?.limit != null ? Math.min(Math.max(filters.limit, 1), 100) : 25;
  const params = new URLSearchParams();
  params.set("limit", String(lim));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  if (filters?.search?.trim()) params.set("search", filters.search.trim());
  if (filters?.productId) params.set("productId", filters.productId);
  const payload = await apiRequest<
    FranchiseNetworkStockAggregate & {
      limit?: number;
      offset?: number;
      hasMore?: boolean;
      nextCursor?: string | null;
    }
  >("/api/franchise/network/stock-aggregate", {
    params,
  });
  const items = payload.items ?? [];
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const offset =
    typeof payload.offset === "number" ? payload.offset : filters?.cursor ? Number(filters.cursor) || 0 : 0;
  const total = typeof payload.total === "number" ? payload.total : items.length;
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : offset + items.length < total;
  return {
    items,
    costingRanAt: payload.costingRanAt,
    total,
    limit,
    offset,
    hasMore,
    nextCursor: payload.nextCursor ?? (hasMore ? String(offset + items.length) : null),
    totals: payload.totals ?? {
      totalAvailable: items.reduce((sum, row) => sum + row.totalAvailable, 0),
      networkValueKes: items.reduce((sum, row) => sum + row.networkValueKes, 0),
    },
  };
}

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
