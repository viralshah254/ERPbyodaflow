import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type ManufacturingBomItem = {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  uom: string;
  type?: string;
  isOptional?: boolean;
  scrapFactor?: number;
};

export type ManufacturingBom = {
  id: string;
  code: string;
  name: string;
  finishedProductId: string;
  finishedProductName?: string;
  finishedProductSku?: string;
  quantity: number;
  uom: string;
  version: string;
  type: "bom" | "formula" | "disassembly";
  direction?: "STANDARD" | "REVERSE";
  isActive: boolean;
  routeId?: string;
  items: ManufacturingBomItem[];
};

export type ManufacturingRoute = {
  id: string;
  code: string;
  name: string;
  description?: string;
  productId?: string;
  operations: Array<{
    id: string;
    sequence: number;
    name: string;
    workCenterId?: string;
    workCenter?: string;
    setupMinutes: number;
    runMinutesPerUnit: number;
  }>;
};

export type ManufacturingWorkOrder = {
  id: string;
  number: string;
  productId: string;
  productName?: string;
  productSku?: string;
  bomId?: string;
  bomName?: string;
  routingId?: string;
  routingName?: string;
  /** GRN (receipt batch) this work order processes. */
  grnId?: string;
  grnNumber?: string;
  quantity: number;
  plannedQuantity: number;
  releasedQuantity: number;
  producedQuantity: number;
  scrapQuantity: number;
  openQuantity: number;
  status: string;
  dueDate?: string;
  plannedDate?: string;
  releasedAt?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
};

export type ManufacturingMrpSuggestion = {
  id: string;
  type: "WORK_ORDER" | "PURCHASE";
  productId: string;
  productName: string;
  productSku?: string;
  requiredQty: number;
  onHandQty: number;
  incomingQty: number;
  shortageQty: number;
  reason: string;
  bomId?: string;
};

export type ManufacturingMrpResponse = {
  items: ManufacturingMrpSuggestion[];
  suggestions: ManufacturingMrpSuggestion[];
  summary: {
    workOrderSuggestions: number;
    purchaseSuggestions: number;
    totalShortageQty: number;
  };
};

export async function fetchManufacturingBoms(): Promise<ManufacturingBom[]> {
  requireLiveApi("Manufacturing BOMs");
  const payload = await apiRequest<{ items: ManufacturingBom[] }>("/api/manufacturing/boms");
  return payload.items ?? [];
}

export async function fetchManufacturingBom(id: string): Promise<ManufacturingBom | null> {
  requireLiveApi("Manufacturing BOM detail");
  try {
    return await apiRequest<ManufacturingBom>(`/api/manufacturing/boms/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function createManufacturingBom(payload: {
  code: string;
  name: string;
  productId: string;
  quantity: number;
  uom: string;
  type: "bom" | "formula" | "disassembly";
}): Promise<{ id: string }> {
  return apiRequest("/api/manufacturing/boms", { method: "POST", body: payload });
}

export async function updateManufacturingBom(id: string, payload: Partial<ManufacturingBom>): Promise<ManufacturingBom> {
  return apiRequest(`/api/manufacturing/boms/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export async function fetchManufacturingRoutes(): Promise<ManufacturingRoute[]> {
  requireLiveApi("Manufacturing routes");
  const payload = await apiRequest<{ items: ManufacturingRoute[] }>("/api/manufacturing/routing");
  return payload.items ?? [];
}

export async function createManufacturingRoute(payload: {
  code: string;
  name: string;
  description?: string;
  operations?: ManufacturingRoute["operations"];
}): Promise<{ id: string }> {
  return apiRequest("/api/manufacturing/routing", { method: "POST", body: payload });
}

export async function updateManufacturingRoute(id: string, payload: Partial<ManufacturingRoute>): Promise<ManufacturingRoute> {
  return apiRequest(`/api/manufacturing/routing/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export async function fetchManufacturingWorkOrders(): Promise<ManufacturingWorkOrder[]> {
  requireLiveApi("Manufacturing work orders");
  const payload = await apiRequest<{ items: ManufacturingWorkOrder[] }>("/api/manufacturing/work-orders");
  return payload.items ?? [];
}

export async function createManufacturingWorkOrder(payload: {
  productId?: string;
  bomId?: string;
  routingId?: string;
  grnId?: string;
  quantity: number;
  dueDate?: string;
  plannedDate?: string;
  notes?: string;
}): Promise<{ id: string; number: string }> {
  return apiRequest("/api/manufacturing/work-orders", { method: "POST", body: payload });
}

export async function runManufacturingWorkOrderAction(
  id: string,
  payload: { action: "release" | "start" | "complete" | "cancel"; producedQuantity?: number; scrapQuantity?: number }
): Promise<ManufacturingWorkOrder> {
  return apiRequest(`/api/manufacturing/work-orders/${encodeURIComponent(id)}/action`, {
    method: "POST",
    body: payload,
  });
}

export async function fetchManufacturingMrp(): Promise<ManufacturingMrpResponse> {
  requireLiveApi("Manufacturing MRP");
  return apiRequest<ManufacturingMrpResponse>("/api/manufacturing/mrp");
}

export async function applyManufacturingMrp(suggestionIds?: string[]): Promise<{ applied: boolean; created: Array<{ id: string; number: string; productId: string }> }> {
  return apiRequest("/api/manufacturing/mrp/apply", {
    method: "POST",
    body: { suggestionIds },
  });
}

export type MaterialAvailabilityLine = {
  productId: string;
  productName: string;
  productSku?: string;
  requiredQty: number;
  onHandQty: number;
  shortfall: number;
  uom: string;
  type: string;
};

export async function checkWorkOrderAvailability(
  bomId: string,
  quantity: number
): Promise<{ lines: MaterialAvailabilityLine[] }> {
  requireLiveApi("Work order availability check");
  const params = new URLSearchParams({ bomId, quantity: String(quantity) });
  return apiRequest<{ lines: MaterialAvailabilityLine[] }>(`/api/manufacturing/work-orders/availability?${params.toString()}`);
}
