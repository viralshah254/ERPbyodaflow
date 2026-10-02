import { apiRequest } from "./client";

export type PendingWarehouseDropRow = {
  deliveryNoteId: string;
  number: string;
  status: string;
  partyId?: string;
  partyName?: string;
  droppedAt: string;
  dispatcherName: string;
  warehouseId: string;
  tripId?: string;
  tripLabel?: string;
  draftGrnId?: string;
  lines: Array<{
    lineId: string;
    droppedWeightKg: number;
    description?: string;
    unit?: string;
    shippedQty?: number;
  }>;
};

export type DriverReturnLine = {
  lineId: string;
  productId?: string;
  description?: string;
  unit?: string;
  shippedQty: number;
};

export type OpenDriverReturnRow = {
  deliveryNoteId: string;
  number: string;
  status: string;
  partyId?: string;
  partyName?: string;
  warehouseId?: string;
  tripId?: string;
  tripLabel?: string;
  vehicleCode?: string;
  dispatchedAt?: string;
  lines: DriverReturnLine[];
};

export type DriverReturnBoard = {
  onRoad: OpenDriverReturnRow[];
  pending: PendingWarehouseDropRow[];
};

export async function fetchDriverReturnBoard(): Promise<DriverReturnBoard> {
  const res = await apiRequest<DriverReturnBoard>("/api/dispatch/driver-returns");
  return { onRoad: res.onRoad ?? [], pending: res.pending ?? [] };
}

export type DriverReturnPage = {
  items: OpenDriverReturnRow[];
  pending: PendingWarehouseDropRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
  totalCount: number;
  pageSizeOptions: number[];
};

/** One page of notes still out with a driver. Search matches the customer, note number, trip, or vehicle. */
export async function fetchDriverReturnPage(filters: {
  search?: string;
  date?: string;
  limit: number;
  offset: number;
}): Promise<DriverReturnPage> {
  const params: Record<string, string> = {
    limit: String(filters.limit),
    offset: String(filters.offset),
  };
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.date) params.date = filters.date;
  const page = await apiRequest<
    Partial<DriverReturnPage> & { onRoad?: OpenDriverReturnRow[]; pending?: PendingWarehouseDropRow[] }
  >("/api/dispatch/driver-returns", { params });
  const items = page.items ?? page.onRoad ?? [];
  return {
    items,
    pending: page.pending ?? [],
    limit: page.limit ?? filters.limit,
    offset: page.offset ?? filters.offset,
    hasMore: Boolean(page.hasMore),
    totalCount: typeof page.totalCount === "number" ? page.totalCount : items.length,
    pageSizeOptions: page.pageSizeOptions?.length ? page.pageSizeOptions : [20, 25, 30, 50],
  };
}

export async function postDriverReturn(
  deliveryNoteId: string,
  body: {
    dispatcherName: string;
    warehouseId: string;
    note?: string;
    lines: Array<{ lineId: string; returnedQty: number; condition: "GOOD" | "DAMAGED" }>;
  }
): Promise<{ id: string; status: string; fullReturn: boolean }> {
  return apiRequest(`/api/dispatch/driver-returns/${encodeURIComponent(deliveryNoteId)}`, {
    method: "POST",
    body,
  });
}

export async function fetchPendingWarehouseDrops(): Promise<PendingWarehouseDropRow[]> {
  const res = await apiRequest<{ items: PendingWarehouseDropRow[] }>(
    "/api/dispatch/warehouse-drops?status=pending"
  );
  return res.items ?? [];
}

export async function postWarehouseDropReceive(
  deliveryNoteId: string,
  lines: Array<{ lineId: string; receivedWeightKg: number }>
): Promise<{ id: string; status: string; postedGrnId: string }> {
  return apiRequest(`/api/dispatch/warehouse-drops/${encodeURIComponent(deliveryNoteId)}/receive`, {
    method: "POST",
    body: { lines },
  });
}
