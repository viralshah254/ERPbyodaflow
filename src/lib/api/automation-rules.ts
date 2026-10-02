import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AutomationRule } from "@/lib/types/automation-rules";

type BackendRule = {
  id: string;
  name: string;
  trigger?: AutomationRule["trigger"] | string;
  conditions?: AutomationRule["conditions"];
  actions?: AutomationRule["actions"];
  version?: number;
  enabled?: boolean;
  requireApproval?: boolean;
};

function mapRule(r: BackendRule): AutomationRule {
  return {
    id: r.id,
    name: r.name,
    trigger:
      typeof r.trigger === "string"
        ? r.trigger === "manual"
          ? { type: "manual" }
          : { type: "event", eventType: r.trigger }
        : r.trigger ?? { type: "manual" },
    conditions: r.conditions ?? [],
    actions: r.actions ?? [],
    version: r.version ?? 1,
    enabled: r.enabled ?? true,
    requireApproval: r.requireApproval ?? false,
  };
}

export async function fetchAutomationRulesApi(): Promise<AutomationRule[]> {
  requireLiveApi("Automation rules");
  const payload = await apiRequest<{ items: BackendRule[] }>("/api/automation/rules");
  return (payload.items ?? []).map(mapRule);
}

export async function createAutomationRuleApi(body: {
  name: string;
  trigger?: AutomationRule["trigger"];
  conditions?: AutomationRule["conditions"];
  actions?: AutomationRule["actions"];
  enabled?: boolean;
  requireApproval?: boolean;
}): Promise<{ id: string }> {
  requireLiveApi("Create automation rule");
  return apiRequest<{ id: string }>("/api/automation/rules", { method: "POST", body });
}

export async function updateAutomationRuleApi(
  id: string,
  body: Partial<{
    name: string;
    trigger: AutomationRule["trigger"];
    conditions: AutomationRule["conditions"];
    actions: AutomationRule["actions"];
    enabled: boolean;
  }>
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

export async function requireApprovalAutomationRuleApi(id: string): Promise<{ id: string; requireApproval: boolean }> {
  requireLiveApi("Require approval for rule");
  return apiRequest<{ id: string; requireApproval: boolean }>(
    `/api/automation/rules/${encodeURIComponent(id)}/require-approval`,
    { method: "POST" }
  );
}
