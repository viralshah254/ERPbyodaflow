import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type DistributionRouteRow = {
  id: string;
  name: string;
  description?: string;
  stops?: string[];
};

export async function fetchDistributionRoutes(): Promise<DistributionRouteRow[]> {
  requireLiveApi("Distribution routes");
  const payload = await apiRequest<{ items: DistributionRouteRow[] }>("/api/distribution/routes");
  return payload.items ?? [];
}

export async function createDistributionRoute(payload: {
  name: string;
  description?: string;
  stops?: string[];
}): Promise<{ id: string }> {
  return apiRequest("/api/distribution/routes", { method: "POST", body: payload });
}
