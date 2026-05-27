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
  lines: Array<{ lineId: string; droppedWeightKg: number }>;
};

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
