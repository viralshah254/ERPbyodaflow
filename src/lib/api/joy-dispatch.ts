import { apiRequest, requireLiveApi } from "./client";

export type JoySalesOrder = {
  id: string;
  number: string;
  date?: string;
  partyId?: string;
  total?: number;
  lineCount?: number;
};

export type JoyPickLine = {
  productId: string;
  name: string;
  sku?: string;
  unit?: string;
  orderedQty: number;
  pickedQty: number;
  allocations?: Array<{ salesOrderId: string; salesOrderNumber?: string; orderedQty: number; pickedQty: number }>;
};

export type JoyPickList = {
  id: string;
  number?: string;
  date: string;
  routeName: string;
  vehicleNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: "DRAFT" | "TRANSFERRED";
  lines: JoyPickLine[];
  dispatchNoteId?: string;
  transferId?: string;
  emailedTo?: string;
};

export const JOY_WHERE_NOW = [
  "Still on the vehicle",
  "Back in the route warehouse",
  "Returned to dispatch",
  "Damaged",
] as const;

export type JoyTallyLine = {
  productId: string;
  name: string;
  picked: number;
  invoiceQty: number;
  deliveryQty: number;
  shortQty: number;
  gap: number;
};

export async function fetchJoySalesOrders(): Promise<JoySalesOrder[]> {
  requireLiveApi("Route pick lists");
  const payload = await apiRequest<{ items: JoySalesOrder[] }>("/api/joy-dispatch/sales-orders");
  return payload.items ?? [];
}

export async function fetchJoyPickLists(): Promise<JoyPickList[]> {
  requireLiveApi("Route pick lists");
  const payload = await apiRequest<{ items: JoyPickList[] }>("/api/joy-dispatch/pick-lists");
  return payload.items ?? [];
}

export async function createJoyPickList(input: {
  salesOrderIds: string[];
  date: string;
  routeName: string;
  vehicleNumber: string;
  toWarehouseId: string;
  fromWarehouseId?: string;
}): Promise<JoyPickList> {
  requireLiveApi("Route pick lists");
  return apiRequest("/api/joy-dispatch/pick-lists", { method: "POST", body: input });
}

export async function saveJoyPickedQuantities(
  id: string,
  lines: Array<{ productId: string; pickedQty: number }>
): Promise<JoyPickList> {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { lines },
  });
}

export async function verifyJoyPickList(id: string): Promise<{ dispatchNote?: { id: string; number?: string } }> {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/verify`, { method: "POST", body: {} });
}

export async function recordJoyShort(id: string, input: { productId: string; quantity: number; whereNow: string }) {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/short`, { method: "POST", body: input });
}

export async function recordJoyDamage(
  id: string,
  input: { lines: Array<{ productId: string; quantity: number }>; toWarehouseId?: string; reason?: string }
) {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/damage`, { method: "POST", body: input });
}

export async function emailJoyDispatchNote(id: string, to: string) {
  requireLiveApi("Route pick lists");
  return apiRequest<{ sent: boolean }>(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/email`, {
    method: "POST",
    body: { to },
  });
}

export async function fetchJoyPickListTally(id: string): Promise<{ lines: JoyTallyLine[] }> {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/tally`);
}

export type JoyMovement = {
  productId?: string;
  quantity?: number;
  type?: string;
  reference?: string;
  documentType?: string;
  otherSide?: string;
};

export type JoyMovementSummary = {
  warehouseId: string;
  from: string;
  to: string;
  inbound: JoyMovement[];
  outbound: JoyMovement[];
  onHand: number;
  reason: string;
};

export async function fetchJoyMovementSummary(warehouseId: string, from: string, to: string) {
  requireLiveApi("Warehouse movement summary");
  const params = new URLSearchParams({ warehouseId, from, to });
  return apiRequest<JoyMovementSummary>(`/api/joy-dispatch/movement-summary?${params.toString()}`);
}

export async function reviewJoyMovementSummary(input: {
  warehouseId: string;
  from: string;
  to: string;
  reason?: string;
}) {
  requireLiveApi("Warehouse movement summary");
  return apiRequest("/api/joy-dispatch/movement-summary/review", { method: "POST", body: input });
}
