import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { RoleRow, UserRow } from "@/lib/types/users-roles";

export interface RoleDetailRow extends RoleRow {
  scope?: "ORG" | "BRANCH" | "DEPARTMENT";
  permissions: string[];
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
  };
}

export async function fetchUsersApi(search?: string): Promise<UserRow[]> {
  requireLiveApi("Users");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendUser[] }>("/api/settings/users", { params });
  return payload.items.map(mapUser);
}

export async function createUserApi(body: Omit<UserRow, "id" | "roleNames">): Promise<UserRow> {
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
