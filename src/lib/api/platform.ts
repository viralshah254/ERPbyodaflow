import { apiRequest } from "./client";

export type PlatformTenantRow = {
  id: string;
  name: string;
  slug?: string;
  plan: string;
  status: string;
  region?: string;
  currency?: string;
  timeZone?: string;
  edition?: string;
  defaultTemplateId?: string;
  enabledModules: string[];
  featureFlags: Record<string, boolean>;
  orgCount: number;
};

export type PlatformOrgRow = {
  id: string;
  name: string;
  tenantId: string;
  tenantName?: string;
  orgType: string;
  orgRole?: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  isActive: boolean;
  edition?: string;
  templateId?: string;
  enabledModules: string[];
  featureFlags: Record<string, boolean>;
  defaultNav: string[];
  parentOrgId?: string;
  franchiseNetworkId?: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
  franchiseStoreFormat?: string;
  franchiseManagerName?: string;
  franchisePersona?: "STANDARD" | "LIGHT_ERP";
};

export async function fetchPlatformTenantsApi(): Promise<PlatformTenantRow[]> {
  const payload = await apiRequest<{ items: PlatformTenantRow[] }>("/api/platform/tenants");
  return payload.items ?? [];
}

export async function fetchPlatformOrgsApi(search?: string): Promise<PlatformOrgRow[]> {
  const params = search ? { search } : undefined;
  const payload = await apiRequest<{ items: PlatformOrgRow[] }>("/api/platform/orgs", { params });
  return payload.items ?? [];
}

export async function updatePlatformTenantApi(
  id: string,
  payload: Partial<PlatformTenantRow>
): Promise<void> {
  await apiRequest(`/api/platform/tenants/${id}`, { method: "PATCH", body: payload });
}

export async function updatePlatformOrgApi(
  id: string,
  payload: Partial<PlatformOrgRow>
): Promise<void> {
  await apiRequest(`/api/platform/orgs/${id}`, { method: "PATCH", body: payload });
}
