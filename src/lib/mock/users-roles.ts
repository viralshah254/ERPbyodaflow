/**
 * Mock users, roles, and permissions for /settings/users-roles.
 */

export interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
  roleNames: string[];
}

export interface RoleRow {
  id: string;
  name: string;
  description?: string;
  permissionCount: number;
}

export const PERMISSION_GROUPS: { group: string; permissions: string[] }[] = [
  { group: "Inventory", permissions: ["inventory.read", "inventory.write", "inventory.delete"] },
  { group: "Sales", permissions: ["sales.read", "sales.write", "sales.approve"] },
  { group: "Purchasing", permissions: ["purchasing.read", "purchasing.write", "purchasing.approve"] },
  { group: "Finance", permissions: ["finance.gl.read", "finance.gl.write", "finance.post_journal", "finance.audit.read"] },
  { group: "Projects", permissions: ["projects.read", "projects.write", "projects.approve"] },
  { group: "Settings", permissions: ["settings.org.read", "settings.users.read", "settings.sequences.read", "settings.inventory.read"] },
  { group: "Approvals", permissions: ["approvals.read", "approvals.approve"] },
];

export const MOCK_ROLES: RoleRow[] = [
  { id: "role-admin", name: "Admin", description: "Full access", permissionCount: 999 },
  { id: "role-finance", name: "Finance", description: "Finance and related", permissionCount: 8 },
  { id: "role-warehouse", name: "Warehouse", description: "Inventory and receipts", permissionCount: 6 },
  { id: "role-sales", name: "Sales", description: "Sales and CRM", permissionCount: 10 },
  { id: "role-purchasing", name: "Purchasing", description: "POs and suppliers", permissionCount: 6 },
];

export const MOCK_USERS: UserRow[] = [
  { id: "u1", email: "admin@acme.com", firstName: "Admin", lastName: "User", roleIds: ["role-admin"], roleNames: ["Admin"] },
  { id: "u2", email: "jane@acme.com", firstName: "Jane", lastName: "Doe", roleIds: ["role-finance", "role-sales"], roleNames: ["Finance", "Sales"] },
  { id: "u3", email: "john@acme.com", firstName: "John", lastName: "Smith", roleIds: ["role-warehouse"], roleNames: ["Warehouse"] },
];

export function getMockUsers(): UserRow[] {
  return [...MOCK_USERS];
}

export function getMockRoles(): RoleRow[] {
  return [...MOCK_ROLES];
}

export function getAllPermissions(): string[] {
  return PERMISSION_GROUPS.flatMap((g) => g.permissions);
}
