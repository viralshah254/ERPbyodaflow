import { apiRequest } from "./client";

export type RouteCollector = { salesRepId: string; salesRep: string; tillNumber: string };
export type CollectionRoute = { id: string; name: string; collectors: RouteCollector[] };
/** `salesRepId` is the SFA user id. Older orders may hold an ERP rep id. */
export type JoyRouteSnapshot = {
  deliveryDate: string; routeName: string; routeWarehouseId: string;
  salesRepId?: string; salesRep?: string; salesRepPhone?: string; tillNumber?: string;
};
export type JoyRouteOrderInput = { deliveryDate: string; salesRepId?: string; tillNumber?: string };
export type RouteSalesRep = { id: string; name: string; code: string };

export function fetchJoyOrderRoute(partyId: string, deliveryDate: string, siteId?: string | null) {
  return apiRequest<{ routes: CollectionRoute[]; defaultRouteId?: string; saved: boolean }>("/api/distribution/joy-order-route", {
    params: { partyId, deliveryDate, ...(siteId ? { siteId } : {}) },
  });
}

export function fetchJoyCollectionRoutes() {
  return apiRequest<{ routes: CollectionRoute[]; reps: RouteSalesRep[] }>("/api/distribution/joy-route-collections");
}

export function saveJoyCollectionRoute(routeId: string, collectors: RouteCollector[]) {
  return apiRequest<CollectionRoute>(`/api/distribution/joy-route-collections/${encodeURIComponent(routeId)}`, {
    method: "PUT",
    body: { collectors },
  });
}

/** Change, add or (with a blank id) remove the SFA rep. The rep's till is saved with them. */
export function setJoyOrderSalesRep(
  documentId: string,
  salesRepId: string,
  type: "sales-order" | "invoice" | "credit-note" = "sales-order",
) {
  const path = type === "sales-order"
    ? `/api/joy-dispatch/sales-orders/${encodeURIComponent(documentId)}/sales-rep`
    : `/api/joy-dispatch/documents/${type}/${encodeURIComponent(documentId)}/sales-rep`;
  return apiRequest<{ joyRoute: JoyRouteSnapshot }>(path, {
    method: "PUT",
    body: { salesRepId },
  });
}
