export type MobilePersona =
  | "owner_admin_web"
  | "procurement_mobile"
  | "dispatch_mobile"
  | "logistics_mobile"
  | "franchise_network_mobile"
  | "franchise_outlet";

/** Human-readable labels for each mobile persona shell. */
export const MOBILE_PERSONA_LABELS: Record<MobilePersona, string> = {
  owner_admin_web: "Web (admin)",
  procurement_mobile: "Mobile: Procurement",
  dispatch_mobile: "Mobile: Dispatch",
  logistics_mobile: "Mobile: Logistics",
  franchise_network_mobile: "Mobile: Franchise Network",
  franchise_outlet: "Mobile: Outlet",
};

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
  phoneNumber?: string | null;
  nationalId?: string | null;
  jobTitle?: string | null;
  employeeCode?: string | null;
  /** Mobile shell this user will be routed to — derived server-side. */
  effectiveMobilePersona?: MobilePersona;
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
  /** Present when this role was seeded from a template. */
  templateKey?: string | null;
  /** Mobile shell implied by this role (null for web/admin/default roles). */
  mobileShell?: MobilePersona | null;
};

/** Mirrors backend `PermissionCatalogGroup` from GET /settings/permissions */
export type PermissionCatalogGroupDto = {
  id: string;
  label: string;
  permissions: { key: string; label: string }[];
};
