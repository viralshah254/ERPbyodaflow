import { apiRequest, requireLiveApi } from "@/lib/api/client";

/** Route close: calculated from posted loads, delivery notes, returns, credit notes and receipts. */
export type RouteCloseListRow = {
  id: string;
  number: string;
  truck: string;
  routeName: string;
  departedAt?: string;
  invoicedAt?: string;
  closeStatus: "OPEN" | "VARIANCE_PENDING" | "CLOSED";
};

export type RouteCloseStockLine = {
  productId: string;
  name: string;
  unit?: string;
  loaded: number;
  issued: number;
  returnedGood: number;
  returnedDamaged: number;
  delivered: number;
  gap: number;
};

export type RouteCloseFigures = {
  loadNoteId: string;
  number: string;
  truck: string;
  routeName: string;
  departed: boolean;
  returnsPosted: { deliveryNotes: number; withReturn: number; awaitingReturn: number };
  stock: { lines: RouteCloseStockLine[]; balanced: boolean };
  sales: { invoiced: number; credited: number; creditPendingApproval: number; netSales: number };
  money: { cashReceipts: number; mpesaReceipts: number; otherReceipts: number; collected: number; stillOwed: number; unexplained: number };
  collections?: { verifiedMpesa: number; pendingMpesa: number; pendingCount: number; mpesaHandover: number };
  handover?: { declaredCash: number; declaredMpesa: number; cashGap: number; mpesaGap: number };
  issues: string[];
  balanced: boolean;
};

export type RouteCloseRecord = {
  status: "CLOSED" | "VARIANCE_PENDING";
  submittedBy: string;
  submittedAt: string;
  driverName?: string;
  declaredCash: number;
  declaredMpesa: number;
  approvedBy?: string;
  approvalNote?: string;
};

export async function fetchRoutesToCloseApi(): Promise<RouteCloseListRow[]> {
  requireLiveApi("Route close");
  const payload = await apiRequest<{ items: RouteCloseListRow[] }>("/api/dispatch/route-close");
  return payload.items ?? [];
}

export async function fetchRouteCloseApi(loadNoteId: string, handover?: { cash: number; mpesa: number }): Promise<RouteCloseFigures> {
  requireLiveApi("Route close");
  const query = handover ? `?cash=${encodeURIComponent(handover.cash)}&mpesa=${encodeURIComponent(handover.mpesa)}` : "";
  return apiRequest(`/api/dispatch/route-close/${encodeURIComponent(loadNoteId)}${query}`);
}

export async function submitRouteCloseApi(
  loadNoteId: string,
  body: { declaredCash: number; declaredMpesa: number; driverUserId?: string; driverName?: string; note?: string }
): Promise<{ figures: RouteCloseFigures; close: RouteCloseRecord }> {
  requireLiveApi("Route close");
  return apiRequest(`/api/dispatch/route-close/${encodeURIComponent(loadNoteId)}`, { method: "POST", body });
}

export async function approveRouteCloseApi(loadNoteId: string, note: string): Promise<RouteCloseRecord> {
  requireLiveApi("Route close");
  return apiRequest(`/api/dispatch/route-close/${encodeURIComponent(loadNoteId)}/approve`, { method: "POST", body: { note } });
}

export type RouteCollection = { _id: string; reference: string; partyName: string; amount: number; tillNumber?: string; invoiceHint?: string; paymentId?: string; verified?: boolean };
const routeCollectionsPath = (id: string) => `/api/dispatch/route-close/${encodeURIComponent(id)}/collections`;
export const fetchRouteCollections = (id: string) =>
  apiRequest<{ enabled: boolean; items: RouteCollection[] }>(routeCollectionsPath(id));
export const recordRouteCollection = (id: string, body: { partyId: string; reference: string; amount: number; tillNumber?: string; invoiceHint?: string }) =>
  apiRequest<RouteCollection>(routeCollectionsPath(id), { method: "POST", body });
