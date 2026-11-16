import { apiRequest } from "./client";

export const JOY_BAKERS_ORG_ID = "org-sfa-6a890b7765042fb41c9d89a6";

export type RouteCollector = { salesRepId: string; salesRep: string; tillNumber: string };
export type CollectionRoute = { id: string; name: string; collectors: RouteCollector[] };
export type JoyRouteSnapshot = RouteCollector & { deliveryDate: string; routeName: string; routeWarehouseId: string };
export type JoyRouteOrderInput = Pick<RouteCollector, "salesRepId" | "tillNumber"> & { deliveryDate: string };
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
