import type { Org } from "@/types/erp";

type OrgCtx = {
  orgRole?: "STANDARD" | "FRANCHISOR" | "FRANCHISEE";
  franchisePersona?: "STANDARD" | "LIGHT_ERP";
  parentOrgId?: string;
};

/** HQ logo for franchise outlets; otherwise signed-in org. */
export function getEffectiveBrandingOrgId(
  org: Pick<Org, "orgId" | "orgRole" | "parentOrgId" | "franchisePersona"> | null | undefined,
  ctx: OrgCtx | null | undefined,
): string | null {
  if (!org?.orgId) return null;
  const role = ctx?.orgRole ?? org.orgRole ?? "STANDARD";
  const persona = ctx?.franchisePersona ?? org.franchisePersona ?? "STANDARD";
  const parentId = ctx?.parentOrgId ?? org.parentOrgId;
  const isOutlet = role === "FRANCHISEE" || persona === "LIGHT_ERP";
  if (isOutlet && parentId) return parentId;
  return org.orgId;
}
