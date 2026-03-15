import { apiRequest, requireLiveApi } from "@/lib/api/client";

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
