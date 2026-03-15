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

export type PlatformSummary = {
  totals: {
    tenants: number;
    orgs: number;
    users: number;
    activeUsers: number;
    franchiseMemberships: number;
  };
  tenantStatus: Record<string, number>;
  tenantPlans: Record<string, number>;
  orgRoles: Record<string, number>;
  recentTenants: Array<{
    id: string;
    name: string;
    plan: string;
    status: string;
    createdAt?: string;
  }>;
};

export type PlatformAuditRow = {
  id: string;
  who: string;
  what: string;
  when: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function fetchPlatformTenantsApi(): Promise<PlatformTenantRow[]> {
  const payload = await apiRequest<{ items: PlatformTenantRow[] }>("/api/platform/tenants");
  return payload.items ?? [];
}

export async function fetchPlatformSummaryApi(): Promise<PlatformSummary> {
  return apiRequest<PlatformSummary>("/api/platform/summary");
}

export async function fetchPlatformAuditApi(limit = 20): Promise<PlatformAuditRow[]> {
  const payload = await apiRequest<{ items: PlatformAuditRow[] }>("/api/platform/audit", {
    params: { limit: String(limit) },
  });
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

export async function createPlatformTenantApi(payload: Partial<PlatformTenantRow> & { name: string }): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/api/platform/tenants", { method: "POST", body: payload });
}

export async function updatePlatformOrgApi(
  id: string,
  payload: Partial<PlatformOrgRow>
): Promise<void> {
  await apiRequest(`/api/platform/orgs/${id}`, { method: "PATCH", body: payload });
}

export async function createPlatformOrgApi(
  payload: Partial<PlatformOrgRow> & { tenantId: string; name: string; orgType: string }
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/api/platform/orgs", { method: "POST", body: payload });
}

export async function provisionPlatformCustomerApi(payload: {
  tenantName: string;
  slug?: string;
  plan?: string;
  status?: string;
  region?: string;
  currency?: string;
  timeZone?: string;
  edition?: string;
  defaultTemplateId?: string;
  orgName: string;
  orgType?: string;
  orgRole?: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  branchName?: string;
  branchCode?: string;
  roleName?: string;
  adminEmail: string;
  adminFirstName?: string;
  adminLastName?: string;
  enabledModules?: string[];
  featureFlags?: Record<string, boolean>;
  defaultNav?: string[];
}): Promise<{
  tenantId: string;
  orgId: string;
  branchId: string;
  roleId: string;
  userId: string;
  adminEmail: string;
  initialPassword?: string;
  mustChangePassword: boolean;
}> {
  return apiRequest("/api/platform/provision/customer", {
    method: "POST",
    body: payload,
  });
}
