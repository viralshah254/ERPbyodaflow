import type { User } from "@/types/erp";
import { useAuthStore } from "@/stores/auth-store";

/**
 * RBAC Permission Helper
 * Checks if a user has a specific permission
 */

// Mock permission system - in real app, this would check against user roles
const MOCK_PERMISSIONS: Record<string, string[]> = {
  "role-admin": [
    "*", // Admin has all permissions
  ],
  "role-finance": [
    "finance.*",
    "projects.*",
    "sales.invoices.read",
    "purchasing.bills.read",
  ],
  "role-warehouse": [
    "inventory.*",
    "purchasing.grn.read",
    "sales.deliveries.read",
  ],
  "role-sales": [
    "sales.*",
    "crm.*",
    "projects.*",
  ],
  "role-purchasing": [
    "purchasing.*",
    "inventory.read",
  ],
};

function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Check for wildcard
  if (userPermissions.includes("*")) {
    return true;
  }

  // Check exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check wildcard patterns (e.g., "finance.*" matches "finance.gl.read")
  const wildcardPerms = userPermissions.filter((p) => p.endsWith(".*"));
  for (const wildcard of wildcardPerms) {
    const prefix = wildcard.replace(".*", "");
    if (requiredPermission.startsWith(prefix + ".")) {
      return true;
    }
  }

  return false;
}

export function can(user: User | null, permission?: string): boolean {
  if (!permission) return true;
  if (!user) return false;

  const runtimePermissions = useAuthStore.getState().permissions;
  if (runtimePermissions.length > 0) {
    return hasPermission(runtimePermissions, permission);
  }

  const fallbackPermissions: string[] = [];
  for (const roleId of user.roleIds) {
    const rolePerms = MOCK_PERMISSIONS[roleId] || [];
    fallbackPermissions.push(...rolePerms);
  }

  return hasPermission(fallbackPermissions, permission);
}

export function canAny(user: User | null, permissions: string[]): boolean {
  if (permissions.length === 0) return true;
  if (!user) return false;

  return permissions.some((perm) => can(user, perm));
}

export function canAll(user: User | null, permissions: string[]): boolean {
  if (permissions.length === 0) return true;
  if (!user) return false;

  return permissions.every((perm) => can(user, perm));
}





