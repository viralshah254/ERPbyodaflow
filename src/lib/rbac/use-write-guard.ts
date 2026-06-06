import { useAuthStore } from "@/stores/auth-store";

function hasAnyPermission(permissions: string[], ...perms: string[]): boolean {
  if (permissions.includes("*")) return true;
  return perms.some((p) => permissions.includes(p));
}

/**
 * Returns true if the current user holds at least one of the given permissions.
 * Handles wildcard (`*`) automatically.
 */
export function useHasPermission(...perms: string[]): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return hasAnyPermission(permissions, ...perms);
}

export function useCanWriteManufacturing(): boolean {
  return useHasPermission("manufacturing.write", "manufacturing.production.write", "admin.settings");
}

export function useCanWriteSales(): boolean {
  return useHasPermission("sales.write", "admin.settings");
}

export function useCanWritePurchasing(): boolean {
  return useHasPermission("purchase.write", "admin.settings");
}

export function useCanWriteInventory(): boolean {
  return useHasPermission("inventory.write", "admin.settings");
}

export function useCanWriteFinance(): boolean {
  return useHasPermission("finance.write", "admin.settings");
}

export function useCanWriteDistribution(): boolean {
  return useHasPermission("distribution.trips.write", "distribution.routes.write", "admin.settings");
}

export function useCanWriteFranchise(): boolean {
  return useHasPermission("franchise.network.write", "franchise.commission.write", "admin.settings");
}

const DOC_TYPE_WRITE_PERMISSIONS: Record<string, string[]> = {
  "sales-order": ["sales.write"],
  "delivery-note": ["sales.write"],
  quote: ["sales.write"],
  "credit-note": ["sales.write"],
  "debit-note": ["sales.write"],
  "purchase-order": ["purchase.write"],
  "purchase-request": ["purchase.write"],
  grn: ["purchase.write"],
  bill: ["purchase.write"],
  "purchase-credit-note": ["purchase.write"],
  "purchase-debit-note": ["purchase.write"],
  invoice: ["finance.ar.write", "finance.write"],
  journal: ["finance.gl.write", "finance.write"],
};

export function useCanWriteDocType(type: string): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  const perms = DOC_TYPE_WRITE_PERMISSIONS[type];
  if (!perms) return true;
  return hasAnyPermission(permissions, ...perms, "admin.settings");
}
