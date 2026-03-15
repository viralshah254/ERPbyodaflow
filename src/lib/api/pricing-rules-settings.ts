import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type PricingRuleSettingRow = {
  id: string;
  name: string;
  enabled: boolean;
};

type BackendPricingRuleSetting = {
  id: string;
  name: string;
  enabled?: boolean;
};

export async function fetchPricingRuleSettingsApi(): Promise<PricingRuleSettingRow[]> {
  requireLiveApi("Pricing rule settings");
  const payload = await apiRequest<{ items: BackendPricingRuleSetting[] }>("/api/settings/products/pricing-rules");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    enabled: item.enabled ?? true,
  }));
}

export async function createPricingRuleSettingApi(name: string): Promise<void> {
  requireLiveApi("Create pricing rule");
  await apiRequest("/api/settings/products/pricing-rules", {
    method: "POST",
    body: { name, enabled: true },
  });
}
