/**
 * Users & roles repo: CRUD + localStorage overlay on mocks.
 */

import type { UserRow, RoleRow } from "@/lib/mock/users-roles";
import { getMockUsers, getMockRoles } from "@/lib/mock/users-roles";

const KEY_USERS = "odaflow_users";
const KEY_ROLES = "odaflow_roles";

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function listUsers(): UserRow[] {
  const stored = loadJson<UserRow[]>(KEY_USERS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockUsers();
}

export function getUserById(id: string): UserRow | undefined {
  return listUsers().find((u) => u.id === id);
}

export function createUser(row: Omit<UserRow, "id">): UserRow {
  const list = listUsers();
  const id = `u${Date.now()}`;
  const created: UserRow = { ...row, id };
  saveJson(KEY_USERS, [...list, created]);
  return created;
}

export function updateUser(id: string, patch: Partial<UserRow>): UserRow | null {
  const list = listUsers();
  const idx = list.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as UserRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_USERS, next);
  return updated;
}

export function listRoles(): RoleRow[] {
  const stored = loadJson<RoleRow[]>(KEY_ROLES);
  if (stored && Array.isArray(stored)) return stored;
  return getMockRoles();
}

export function getRoleById(id: string): RoleRow | undefined {
  return listRoles().find((r) => r.id === id);
}

export function createRole(row: Omit<RoleRow, "id"> & { permissionCount?: number }): RoleRow {
  const list = listRoles();
  const id = `role-${Date.now()}`;
  const created: RoleRow = {
    ...row,
    id,
    permissionCount: row.permissionCount ?? 0,
  };
  saveJson(KEY_ROLES, [...list, created]);
  return created;
}

export function updateRole(id: string, patch: Partial<RoleRow>): RoleRow | null {
  const list = listRoles();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as RoleRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_ROLES, next);
  return updated;
}
