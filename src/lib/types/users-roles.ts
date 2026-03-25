export type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  copilotEnabled?: boolean;
  roleIds: string[];
  roleNames: string[];
  /** True when a Firebase account exists (admin can set password). */
  hasSignIn?: boolean;
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

export type RoleRow = {
  id: string;
  name: string;
  description?: string;
  permissionCount: number;
};

export const PERMISSION_GROUPS: { group: string; permissions: string[] }[] = [
  { group: "Inventory", permissions: ["inventory.read", "inventory.write", "inventory.delete"] },
  { group: "Sales", permissions: ["sales.read", "sales.write", "sales.approve"] },
  { group: "Purchasing", permissions: ["purchasing.read", "purchasing.write", "purchasing.approve"] },
  { group: "Finance", permissions: ["finance.gl.read", "finance.gl.write", "finance.post_journal", "finance.audit.read"] },
  { group: "Projects", permissions: ["projects.read", "projects.write", "projects.approve"] },
  { group: "Settings", permissions: ["settings.org.read", "settings.users.read", "settings.sequences.read", "settings.inventory.read"] },
  { group: "Approvals", permissions: ["approvals.read", "approvals.approve"] },
];

export function getAllPermissions(): string[] {
  return PERMISSION_GROUPS.flatMap((g) => g.permissions);
}
