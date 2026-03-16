import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AutomationRule } from "@/lib/types/automation-rules";

type BackendRule = {
  id: string;
  name: string;
  trigger?: string;
  conditions?: Record<string, unknown>;
  actions?: unknown[];
  enabled?: boolean;
};

function mapRule(r: BackendRule): AutomationRule {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger ?? "manual",
    conditions: r.conditions ? JSON.stringify(r.conditions) : "",
    actions: Array.isArray(r.actions) ? r.actions.map(String).join(", ") : "",
    enabled: r.enabled ?? true,
  };
}

export async function fetchAutomationRulesApi(): Promise<AutomationRule[]> {
  requireLiveApi("Automation rules");
  const payload = await apiRequest<{ items: BackendRule[] }>("/api/automation/rules");
  return (payload.items ?? []).map(mapRule);
}

export async function createAutomationRuleApi(body: {
  name: string;
  trigger?: string;
  enabled?: boolean;
}): Promise<{ id: string }> {
  requireLiveApi("Create automation rule");
  return apiRequest<{ id: string }>("/api/automation/rules", { method: "POST", body });
}

export async function updateAutomationRuleApi(
  id: string,
  body: Partial<{ name: string; trigger: string; enabled: boolean }>
): Promise<AutomationRule> {
  requireLiveApi("Update automation rule");
  const payload = await apiRequest<BackendRule>(`/api/automation/rules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapRule(payload);
}

export async function deleteAutomationRuleApi(id: string): Promise<void> {
  requireLiveApi("Delete automation rule");
  await apiRequest(`/api/automation/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
}
