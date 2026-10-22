/** Top Food Ea Ltd. Capitals are a display rule for this organisation only. */
export const TOP_FOOD_ORG_ID = "org-top-food-ea-ltd";

export function isTopFoodOrg(
  org: { orgId?: string | null; name?: string | null } | null | undefined
): boolean {
  if (!org) return false;
  if (org.orgId === TOP_FOOD_ORG_ID) return true;
  const compact = String(org.name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return compact.includes("topfood");
}
