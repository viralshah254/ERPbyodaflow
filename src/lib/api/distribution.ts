import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type DistributionRouteRow = {
  id: string;
  name: string;
  description?: string;
  stops?: string[];
  kind?: "SALES" | "OPS";
  corridor?: string;
  weekday?: number;
  fulfilmentWarehouseId?: string;
  fulfilmentWarehouseName?: string;
  sfaRouteName?: string;
  openPickPackCount?: number;
  tripsPlannedCount?: number;
  tripsInTransitCount?: number;
};

export async function fetchDistributionRoutes(params?: {
  today?: boolean;
  weekday?: number;
  includeActivity?: boolean;
}): Promise<DistributionRouteRow[]> {
  requireLiveApi("Distribution routes");
  const query: Record<string, string> = {};
  if (params?.today) query.today = "1";
  if (params?.weekday != null) query.weekday = String(params.weekday);
  if (params?.includeActivity) query.includeActivity = "1";
  const payload = await apiRequest<{ items: DistributionRouteRow[] }>("/api/distribution/routes", {
    params: Object.keys(query).length ? query : undefined,
  });
  return payload.items ?? [];
}

export async function createDistributionRoute(payload: {
  name: string;
  description?: string;
  stops?: string[];
}): Promise<{ id: string }> {
  return apiRequest("/api/distribution/routes", { method: "POST", body: payload });
}
