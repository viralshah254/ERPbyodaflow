import { apiRequest } from "./client";

export type PlatformTenantRow = {
  id: string;
  /** Business owner name (tenant display name). */
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
  /** Company/organization names under this tenant. */
  orgNames?: string[];
  /** First company name (primary org). */
  primaryOrgName?: string | null;
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
    openSupportCount?: number;
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

export type PlatformTenantDetail = {
  tenant: PlatformTenantRow;
  orgs: PlatformOrgRow[];
};

export async function fetchPlatformTenantDetailApi(tenantId: string): Promise<PlatformTenantDetail> {
  return apiRequest<PlatformTenantDetail>(`/api/platform/tenants/${tenantId}`);
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

export async function setPlatformOrgAccessApi(
  id: string,
  isActive: boolean
): Promise<{ id: string; isActive: boolean }> {
  return apiRequest(`/api/platform/orgs/${id}/access`, { method: "PATCH", body: { isActive } });
}

export type PlatformSubscriptionRow = {
  id: string;
  tenantId: string;
  orgId: string;
  plan: string;
  billingCycle: "monthly" | "annual";
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  startedAt: string;
  stripeSubscriptionId?: string;
};

export type PlatformInvoiceRow = {
  id: string;
  subscriptionId: string;
  tenantId: string;
  orgId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  totalCents: number;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPriceCents: number; amountCents: number }>;
  createdAt: string;
};

export async function fetchPlatformSubscriptionsApi(tenantId?: string): Promise<PlatformSubscriptionRow[]> {
  const params = tenantId ? { tenantId } : undefined;
  const payload = await apiRequest<{ items: PlatformSubscriptionRow[] }>("/api/platform/subscriptions", { params });
  return payload.items ?? [];
}

export async function createPlatformSubscriptionApi(payload: {
  tenantId: string;
  orgId: string;
  plan?: string;
  billingCycle?: "monthly" | "annual";
  status?: string;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/api/platform/subscriptions", { method: "POST", body: payload });
}

export async function updatePlatformSubscriptionApi(
  id: string,
  payload: Partial<PlatformSubscriptionRow>
): Promise<void> {
  await apiRequest(`/api/platform/subscriptions/${id}`, { method: "PATCH", body: payload });
}

export async function fetchPlatformInvoicesApi(tenantId?: string, status?: string): Promise<PlatformInvoiceRow[]> {
  const params: Record<string, string> = {};
  if (tenantId) params.tenantId = tenantId;
  if (status) params.status = status;
  const payload = await apiRequest<{ items: PlatformInvoiceRow[] }>("/api/platform/invoices", { params: Object.keys(params).length ? params : undefined });
  return payload.items ?? [];
}

export async function createPlatformInvoiceApi(payload: {
  subscriptionId: string;
  tenantId: string;
  orgId: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  status?: string;
  totalCents?: number;
  currency?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPriceCents: number; amountCents: number }>;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/api/platform/invoices", { method: "POST", body: payload });
}

export async function updatePlatformInvoiceApi(id: string, payload: { status?: string }): Promise<void> {
  await apiRequest(`/api/platform/invoices/${id}`, { method: "PATCH", body: payload });
}

export type PlatformBillingSummary = {
  activeSubscriptions: number;
  mrrCents: number;
  revenueCents: number;
  paidInvoicesCount: number;
};

export async function fetchPlatformBillingSummaryApi(): Promise<PlatformBillingSummary> {
  return apiRequest<PlatformBillingSummary>("/api/platform/billing/summary");
}

export type PlatformSupportRequestRow = {
  id: string;
  tenantId: string;
  requestedBy: string;
  subject: string;
  description?: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchPlatformSupportRequestsApi(tenantId?: string, status?: string): Promise<PlatformSupportRequestRow[]> {
  const params: Record<string, string> = {};
  if (tenantId) params.tenantId = tenantId;
  if (status) params.status = status;
  const payload = await apiRequest<{ items: PlatformSupportRequestRow[] }>("/api/platform/support/requests", {
    params: Object.keys(params).length ? params : undefined,
  });
  return payload.items ?? [];
}

export async function createPlatformSupportRequestApi(payload: {
  tenantId: string;
  subject: string;
  description?: string;
  status?: string;
  assignedTo?: string;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string }>("/api/platform/support/requests", { method: "POST", body: payload });
}

export async function updatePlatformSupportRequestApi(
  id: string,
  payload: { status?: string; assignedTo?: string; subject?: string; description?: string }
): Promise<void> {
  await apiRequest(`/api/platform/support/requests/${id}`, { method: "PATCH", body: payload });
}

export async function createPlatformUserApi(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  roleIds: string[];
  initialPassword?: string;
  mustChangePassword?: boolean;
}): Promise<{ id: string; email: string; initialPassword?: string; mustChangePassword?: boolean; billingImpact?: { invoiceId: string } }> {
  return apiRequest("/api/platform/users", { method: "POST", body: payload });
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
  initialPassword: string;
  mustChangePassword?: boolean;
  adminFirstName?: string;
  adminLastName?: string;
  templateId?: string;
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
  billingImpact?: { invoiceId: string };
}> {
  return apiRequest("/api/platform/provision/customer", {
    method: "POST",
    body: payload,
  });
}
