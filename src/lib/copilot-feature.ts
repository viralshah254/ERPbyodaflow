"use client";

import { useOrgContextStore } from "@/stores/orgContextStore";
import type { FeatureFlagKey } from "@/config/industryTemplates/index";

/**
 * Copilot is hidden unless the org has `featureFlags.copilot === true`, or
 * `NEXT_PUBLIC_COPILOT_ENABLED=true` for local/testing.
 */
export function isCopilotFeatureEnabled(
  featureFlags: Partial<Record<FeatureFlagKey, boolean>>
): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_COPILOT_ENABLED === "true") {
    return true;
  }
  return featureFlags.copilot === true;
}

export function useCopilotFeatureEnabled(): boolean {
  const flags = useOrgContextStore((s) => s.featureFlags);
  return isCopilotFeatureEnabled(flags);
}
