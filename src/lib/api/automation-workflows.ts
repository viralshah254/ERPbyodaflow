import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { CustomRecommendationAction } from "@/types/copilotActions";

export type AutomationWorkflowRow = {
  id: string;
  name: string;
  enabled: boolean;
  createdAt?: string;
};

type BackendWorkflow = {
  id: string;
  name: string;
  enabled?: boolean;
  createdAt?: string;
};

export async function fetchAutomationWorkflowsApi(): Promise<AutomationWorkflowRow[]> {
  requireLiveApi("Automation workflows");
  const payload = await apiRequest<{ items: BackendWorkflow[] }>("/api/automation/workflows");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    enabled: item.enabled ?? true,
    createdAt: item.createdAt,
  }));
}

export async function createAutomationWorkflowApi(name: string): Promise<{ id: string }> {
  requireLiveApi("Create automation workflow");
  return apiRequest<{ id: string }>("/api/automation/workflows", {
    method: "POST",
    body: { name, enabled: true },
  });
}

export async function applyAutomationInsightApi(insightId: string, actionId: string): Promise<void> {
  requireLiveApi("Automation insight apply");
  await apiRequest(`/api/automation/insights/${encodeURIComponent(insightId)}/apply`, {
    method: "POST",
    body: { actionId },
  });
}

type BackendAutomationInsight = {
  id: string;
  recommendationId?: string;
  agentKey?: string;
  inputSummary?: string;
  outcome?: string;
  appliedAt?: string;
  createdAt?: string;
};

function inferRiskLevel(agentKey?: string): CustomRecommendationAction["riskLevel"] {
  const key = (agentKey ?? "").toLowerCase();
  if (key.includes("pricing") || key.includes("payroll")) return "medium";
  return "low";
}

export async function fetchAutomationInsightsApi(): Promise<CustomRecommendationAction[]> {
  requireLiveApi("Automation insights");
  const payload = await apiRequest<{ items: BackendAutomationInsight[] }>("/api/automation/ai-insights");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    type: "custom-recommendation",
    summary: item.inputSummary?.trim() || item.recommendationId || "Automation recommendation",
    riskLevel: inferRiskLevel(item.agentKey),
    requiresApproval: false,
    entitiesReferenced: [],
    createdAt: item.createdAt ?? new Date().toISOString(),
    payload: {
      recommendationKey: item.recommendationId || item.id,
      narrative: item.outcome?.trim() || `Suggested by ${item.agentKey || "automation"} engine.`,
    },
  }));
}
