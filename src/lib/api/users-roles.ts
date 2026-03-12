import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { getMockUsers, getMockRoles, type RoleRow, type UserRow } from "@/lib/mock/users-roles";

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
  branchIds?: string[];
  roleIds?: string[];
  roleNames?: string[];
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
    roleIds: user.roleIds ?? [],
    roleNames: user.roleNames ?? [],
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
  if (!isApiConfigured()) return getMockUsers();
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendUser[] }>("/api/settings/users", { params });
  return payload.items.map(mapUser);
}

export async function createUserApi(body: Omit<UserRow, "id" | "roleNames">): Promise<UserRow> {
  if (!isApiConfigured()) {
    return {
      id: `local-user-${Date.now()}`,
      ...body,
      roleNames: [],
    };
  }
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
  if (!isApiConfigured()) {
    const existing = getMockUsers().find((user) => user.id === id);
    return {
      id,
      email: body.email ?? existing?.email ?? "",
      firstName: body.firstName ?? existing?.firstName ?? "",
      lastName: body.lastName ?? existing?.lastName ?? "",
      roleIds: body.roleIds ?? existing?.roleIds ?? [],
      roleNames: existing?.roleNames ?? [],
    };
  }
  const payload = await apiRequest<BackendUser>(`/api/settings/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapUser(payload);
}

export async function fetchRolesApi(search?: string): Promise<RoleDetailRow[]> {
  if (!isApiConfigured()) {
    return getMockRoles().map((role) => ({ ...role, permissions: [] }));
  }
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
  if (!isApiConfigured()) {
    return {
      id: `local-role-${Date.now()}`,
      name: body.name,
      description: body.description,
      scope: body.scope,
      permissions: body.permissions,
      permissionCount: body.permissions.length,
    };
  }
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
  if (!isApiConfigured()) {
    const existing = getMockRoles().find((role) => role.id === id);
    return {
      id,
      name: body.name ?? existing?.name ?? "",
      description: body.description ?? existing?.description,
      scope: body.scope,
      permissions: body.permissions ?? [],
      permissionCount: body.permissions?.length ?? existing?.permissionCount ?? 0,
    };
  }
  const payload = await apiRequest<BackendRole>(`/api/settings/roles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapRole(payload);
}
