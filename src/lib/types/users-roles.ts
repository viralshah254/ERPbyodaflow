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

/** Mirrors backend `PermissionCatalogGroup` from GET /settings/permissions */
export type PermissionCatalogGroupDto = {
  id: string;
  label: string;
  permissions: { key: string; label: string }[];
};
