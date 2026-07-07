import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { MobilePersona, PermissionCatalogGroupDto, RoleRow, UserRow } from "@/lib/types/users-roles";

export interface RoleDetailRow extends RoleRow {
  scope?: "ORG" | "BRANCH" | "DEPARTMENT";
  permissions: string[];
  templateKey?: string | null;
  mobileShell?: MobilePersona | null;
}

type BackendUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  copilotEnabled?: boolean;
  branchIds?: string[];
  roleIds?: string[];
  roleNames?: string[];
  hasSignIn?: boolean;
  phoneNumber?: string | null;
  nationalId?: string | null;
  jobTitle?: string | null;
  employeeCode?: string | null;
  effectiveMobilePersona?: string;
  stagedForCheckout?: boolean;
  checkout?: {
    id: string | null;
    quoteTotalCents: number;
    projectedMonthlyCents: number;
    items: Array<{ id: string; itemType: string; label: string }>;
  };
  billingImpact?: {
    invoiceId: string;
    proratedCents?: number;
    charged?: boolean;
    lineItems?: { description: string; amountCents: number }[];
  };
};

type BackendRole = {
  id: string;
  name: string;
  description?: string;
  scope?: "ORG" | "BRANCH" | "DEPARTMENT";
  permissions?: string[];
  permissionCount?: number;
  templateKey?: string | null;
  mobileShell?: string | null;
};

function mapUser(user: BackendUser): UserRow {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    status: user.status as UserRow["status"],
    copilotEnabled: user.copilotEnabled ?? false,
    roleIds: user.roleIds ?? [],
    roleNames: user.roleNames ?? [],
    hasSignIn: user.hasSignIn,
    phoneNumber: user.phoneNumber ?? null,
    nationalId: user.nationalId ?? null,
    jobTitle: user.jobTitle ?? null,
    employeeCode: user.employeeCode ?? null,
    effectiveMobilePersona: user.effectiveMobilePersona as MobilePersona | undefined,
    stagedForCheckout: user.stagedForCheckout ?? false,
    checkout: user.checkout,
    billingImpact: user.billingImpact,
  };
}

function mapRole(role: BackendRole): RoleDetailRow {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    scope: role.scope,
    permissions: role.permissions ?? [],
    permissionCount: role.permissionCount ?? role.permissions?.length ?? 0,
    templateKey: role.templateKey ?? null,
    mobileShell: (role.mobileShell ?? null) as MobilePersona | null,
  };
}

export async function fetchUsersApi(search?: string): Promise<UserRow[]> {
  requireLiveApi("Users");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendUser[] }>("/api/settings/users", { params });
  return payload.items.map(mapUser);
}

export type StagedUserResponse = Omit<UserRow, "id"> & {
  /** Absent on staged users — a real id is assigned only after billing checkout is confirmed. */
  id?: string;
};

export async function createUserApi(body: Omit<UserRow, "id" | "roleNames">): Promise<StagedUserResponse> {
  requireLiveApi("Create user");
  const payload = await apiRequest<BackendUser>("/api/settings/users", {
    method: "POST",
    body,
  });
  return mapUser(payload);
}

export async function updateUserApi(
  id: string,
  body: Partial<Omit<UserRow, "id" | "roleNames">>
): Promise<UserRow> {
  requireLiveApi("Update user");
  const payload = await apiRequest<BackendUser>(`/api/settings/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapUser(payload);
}

export async function fetchPermissionCatalogApi(): Promise<PermissionCatalogGroupDto[]> {
  requireLiveApi("Permission catalog");
  const payload = await apiRequest<{ groups: PermissionCatalogGroupDto[] }>("/api/settings/permissions");
  return payload.groups ?? [];
}

export async function fetchRolesApi(search?: string): Promise<RoleDetailRow[]> {
  requireLiveApi("Roles");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendRole[] }>("/api/settings/roles", { params });
  return payload.items.map(mapRole);
}

export async function createRoleApi(body: {
  name: string;
  description?: string;
  scope?: "ORG" | "BRANCH" | "DEPARTMENT";
  permissions: string[];
}): Promise<RoleDetailRow> {
  requireLiveApi("Create role");
  const payload = await apiRequest<BackendRole>("/api/settings/roles", {
    method: "POST",
    body,
  });
  return mapRole(payload);
}

export async function updateRoleApi(
  id: string,
  body: Partial<{
    name: string;
    description?: string;
    scope?: "ORG" | "BRANCH" | "DEPARTMENT";
    permissions: string[];
  }>
): Promise<RoleDetailRow> {
  requireLiveApi("Update role");
  const payload = await apiRequest<BackendRole>(`/api/settings/roles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapRole(payload);
}

export async function seedStandardRolesApi(): Promise<{
  ok: boolean;
  count: number;
  templateId: string;
  roles: Array<{ key: string; id: string; created: boolean }>;
}> {
  requireLiveApi("Provision standard roles");
  return apiRequest("/api/settings/roles/seed-standard", { method: "POST" });
}

export async function setUserPasswordApi(
  userId: string,
  body: { newPassword: string; mustChangePassword?: boolean }
): Promise<void> {
  requireLiveApi("Set password");
  await apiRequest(`/api/settings/users/${encodeURIComponent(userId)}/password`, {
    method: "POST",
    body,
  });
}

export async function deleteUserApi(userId: string): Promise<void> {
  requireLiveApi("Delete user");
  await apiRequest(`/api/settings/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Franchise outlet users (Franchisees tab on Users & Roles)
// ---------------------------------------------------------------------------

export interface FranchiseOutletUserRow {
  outletId: string;
  name: string;
  code: string | null;
  territory: string | null;
  managerName: string | null;
  isActive: boolean;
  agreementStatus: string;
  adminEmail: string | null;
  adminStatus: string | null;
  adminHasSignIn: boolean;
  adminRoleNames: string[];
  adminMobilePersona: MobilePersona | null;
  adminLastLoginAt: string | null;
}

export async function fetchFranchiseOutletUsersApi(): Promise<FranchiseOutletUserRow[]> {
  requireLiveApi("Franchise outlets");
  const payload = await apiRequest<{ items: FranchiseOutletUserRow[] }>(
    "/api/settings/franchise-outlets"
  );
  return payload.items;
}

export type PasswordResetRequestRow = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roleNames: string[];
  mobilePersona: string;
  mobilePersonaLabel: string;
  requestedAt: string;
};

export async function fetchPasswordResetRequestsApi(): Promise<PasswordResetRequestRow[]> {
  requireLiveApi("Password reset requests");
  const payload = await apiRequest<{ items: PasswordResetRequestRow[] }>(
    "/api/settings/password-reset-requests"
  );
  return payload.items;
}

export async function dismissPasswordResetRequestApi(userId: string): Promise<void> {
  requireLiveApi("Password reset requests");
  await apiRequest(`/api/settings/password-reset-requests/${encodeURIComponent(userId)}/dismiss`, {
    method: "POST",
  });
}
