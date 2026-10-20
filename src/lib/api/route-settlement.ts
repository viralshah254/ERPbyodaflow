import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type RouteSettlementRow = {
  _id: string;
  routeDate: string;
  driverId: string;
  expected: number;
  cash: number;
  mpesa: number;
  returnsAmount: number;
  status: "OPEN" | "SETTLED";
};

export async function fetchRouteSettlementsApi(): Promise<RouteSettlementRow[]> {
  requireLiveApi("Route settlement");
  const payload = await apiRequest<{ items: RouteSettlementRow[] }>("/api/distribution/route-settlements");
  return payload.items ?? [];
}

export async function createRouteSettlementApi(body: {
  routeDate: string;
  driverId: string;
  expected: number;
  cash: number;
  mpesa: number;
  returnsAmount: number;
}): Promise<{ id: string }> {
  requireLiveApi("Route settlement");
  return apiRequest("/api/distribution/route-settlements", { method: "POST", body });
}

export async function approveRouteSettlementApi(id: string): Promise<{ id: string; status: string }> {
  requireLiveApi("Route settlement");
  return apiRequest(`/api/distribution/route-settlements/${encodeURIComponent(id)}/approve`, { method: "POST" });
}
