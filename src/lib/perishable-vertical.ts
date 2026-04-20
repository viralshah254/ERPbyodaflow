import type { FeatureFlagKey } from "@/config/industryTemplates/index";
import { PERISHABLE_DISTRIBUTION_TEMPLATE_IDS } from "@/config/industryTemplates/templates";

/**
 * Perishable / seafood vertical: Control Tower, supply chain journey, and related surfaces.
 * Matches the gate in control-tower/page.tsx.
 */
export function isPerishableVerticalEnabled(
  templateId: string | null | undefined,
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>
): boolean {
  const id = templateId ?? "";
  if (PERISHABLE_DISTRIBUTION_TEMPLATE_IDS.includes(id as (typeof PERISHABLE_DISTRIBUTION_TEMPLATE_IDS)[number])) {
    return true;
  }
  return (
    featureFlags.procurementAuditCashWeight === true &&
    featureFlags.vmiReplenishment === true &&
    featureFlags.commissionEngine === true
  );
}
