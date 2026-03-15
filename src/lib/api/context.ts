import { apiRequest, requireLiveApi } from "./client";
import type { Branch, Org, Tenant, User } from "@/types/erp";

export type RuntimeOrgContext = {
  templateId: string;
  edition: string;
  enabledModules: string[];
  featureFlags: Record<string, boolean>;
  terminology: Record<string, string>;
  defaultNav: string[];
  orgRole: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  parentOrgId?: string;
  franchiseNetworkId?: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
  franchiseStoreFormat?: string;
  franchiseManagerName?: string;
  franchisePersona?: "STANDARD" | "LIGHT_ERP";
};

type BackendUser = {
  id: string;
  orgId: string;
  branchIds: string[];
  roleIds: string[];
  email: string;
  firstName?: string;
  lastName?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: string;
  updatedAt?: string;
  mustChangePassword?: boolean;
};

type BackendOrg = {
  id: string;
  tenantId: string;
  orgType: "MANUFACTURER" | "DISTRIBUTOR" | "SHOP";
  orgRole?: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  name: string;
  taxId?: string;
  registrationNumber?: string;
  isActive?: boolean;
  edition?: string;
  templateId?: string;
  enabledModules?: string[];
  featureFlags?: Record<string, boolean>;
  terminology?: Record<string, string>;
  defaultNav?: string[];
  parentOrgId?: string;
  franchiseNetworkId?: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
  franchiseStoreFormat?: string;
  franchiseManagerName?: string;
  franchisePersona?: "STANDARD" | "LIGHT_ERP";
};

type BackendTenant = {
  id: string;
  name: string;
  slug?: string;
  plan?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  status?: "ACTIVE" | "TRIAL" | "SUSPENDED";
  region?: string;
  currency?: string;
  timeZone?: string;
  edition?: string;
  defaultTemplateId?: string;
  enabledModules?: string[];
  featureFlags?: Record<string, boolean>;
};

type BackendBranch = {
  id: string;
  orgId: string;
  name: string;
  isDefault?: boolean;
  code?: string;
};

type BackendSession = {
  user: BackendUser;
  org: BackendOrg;
  tenant: BackendTenant;
  branches: BackendBranch[];
  currentBranchId: string | null;
  permissions: string[];
  orgContext: RuntimeOrgContext;
};

function mapDate(value?: string): Date {
  return value ? new Date(value) : new Date();
}

function mapUser(user: BackendUser): User {
  return {
    userId: user.id,
    orgId: user.orgId,
    branchIds: user.branchIds ?? [],
    roleIds: user.roleIds ?? [],
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    status: user.status,
    createdAt: mapDate(user.createdAt),
    updatedAt: mapDate(user.updatedAt),
    mustChangePassword: user.mustChangePassword,
  };
}

function mapOrg(org: BackendOrg): Org {
  return {
    orgId: org.id,
    tenantId: org.tenantId,
    orgType: org.orgType,
    orgRole: org.orgRole,
    name: org.name,
    taxId: org.taxId,
    registrationNumber: org.registrationNumber,
    isActive: org.isActive !== false,
    edition: org.edition,
    templateId: org.templateId,
    enabledModules: org.enabledModules,
    featureFlags: org.featureFlags,
    terminology: org.terminology,
    defaultNav: org.defaultNav,
    parentOrgId: org.parentOrgId,
    franchiseNetworkId: org.franchiseNetworkId,
    franchiseCode: org.franchiseCode,
    franchiseTerritory: org.franchiseTerritory,
    franchiseStoreFormat: org.franchiseStoreFormat,
    franchiseManagerName: org.franchiseManagerName,
    franchisePersona: org.franchisePersona,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapTenant(tenant: BackendTenant): Tenant {
  return {
    tenantId: tenant.id,
    name: tenant.name,
    plan: tenant.plan ?? "ENTERPRISE",
    status: tenant.status ?? "ACTIVE",
    region: tenant.region ?? "KE",
    currency: tenant.currency ?? "KES",
    timeZone: tenant.timeZone ?? "Africa/Nairobi",
    edition: tenant.edition,
    defaultTemplateId: tenant.defaultTemplateId,
    enabledModules: tenant.enabledModules,
    featureFlags: tenant.featureFlags,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapBranch(branch: BackendBranch): Branch {
  return {
    branchId: branch.id,
    orgId: branch.orgId,
    name: branch.name,
    isHeadOffice: branch.isDefault === true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function fetchRuntimeSession(): Promise<{
  user: User;
  org: Org;
  tenant: Tenant;
  branches: Branch[];
  currentBranch: Branch | null;
  permissions: string[];
  orgContext: RuntimeOrgContext;
}> {
  requireLiveApi("Runtime session");
  const payload = await apiRequest<BackendSession>("/api/me");
  const branches = (payload.branches ?? []).map(mapBranch);
  return {
    user: mapUser(payload.user),
    org: mapOrg(payload.org),
    tenant: mapTenant(payload.tenant),
    branches,
    currentBranch: branches.find((branch) => branch.branchId === payload.currentBranchId) ?? null,
    permissions: payload.permissions ?? [],
    orgContext: payload.orgContext,
  };
}

export async function saveCurrentOrgContext(payload: {
  templateId?: string;
  edition?: string;
  enabledModules?: string[];
  featureFlags?: Record<string, boolean>;
  terminology?: Record<string, string>;
  defaultNav?: string[];
  orgRole?: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  parentOrgId?: string;
  franchiseNetworkId?: string;
  franchiseCode?: string;
  franchiseTerritory?: string;
  franchiseStoreFormat?: string;
  franchiseManagerName?: string;
  franchisePersona?: "STANDARD" | "LIGHT_ERP";
}): Promise<RuntimeOrgContext> {
  const result = await apiRequest<{ orgContext: RuntimeOrgContext }>("/api/org-context", {
    method: "PATCH",
    body: payload,
  });
  return result.orgContext;
}
