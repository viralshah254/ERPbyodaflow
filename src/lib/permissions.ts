import type { User, Permission, PermissionContext, Role } from "@/types/erp";

/**
 * Permission evaluation system for client-side access control
 */
export function can(
  user: User | null,
  permission: Permission,
  context?: PermissionContext
): boolean {
  if (!user) return false;

  // In a real app, this would fetch roles and evaluate policies
  // For now, we'll use a simple mock implementation
  // The backend should handle the actual permission checks

  // Mock: Check if user has the permission in any of their roles
  // This is a simplified version - real implementation would:
  // 1. Fetch user's roles with their permissions
  // 2. Evaluate context-based rules
  // 3. Check attribute-based conditions

  return true; // Placeholder - will be replaced with actual role/permission checks
}

export function hasAnyPermission(
  user: User | null,
  permissions: Permission[],
  context?: PermissionContext
): boolean {
  return permissions.some((perm) => can(user, perm, context));
}

export function hasAllPermissions(
  user: User | null,
  permissions: Permission[],
  context?: PermissionContext
): boolean {
  return permissions.every((perm) => can(user, perm, context));
}

/**
 * Common permission strings
 */
export const Permissions = {
  // Inventory
  INVENTORY_READ: "inventory.read",
  INVENTORY_WRITE: "inventory.write",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_TRANSFER: "inventory.transfer",
  
  // Sales
  SALES_READ: "sales.read",
  SALES_WRITE: "sales.write",
  SALES_APPROVE: "sales.approve",
  SALES_CANCEL: "sales.cancel",
  
  // Purchasing
  PURCHASE_READ: "purchase.read",
  PURCHASE_WRITE: "purchase.write",
  PURCHASE_APPROVE: "purchase.approve",
  
  // Finance
  FINANCE_READ: "finance.read",
  FINANCE_WRITE: "finance.write",
  FINANCE_POST_JOURNAL: "finance.post_journal",
  FINANCE_APPROVE: "finance.approve",
  
  // Manufacturing
  MANUFACTURING_READ: "manufacturing.read",
  MANUFACTURING_WRITE: "manufacturing.write",
  
  // Admin
  ADMIN_USERS: "admin.users",
  ADMIN_SETTINGS: "admin.settings",
  ADMIN_CUSTOMIZATION: "admin.customization",
} as const;

