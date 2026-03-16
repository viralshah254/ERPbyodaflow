import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type CustomizerTransition = { from: string; to: string };

export type CustomizerWorkflowRow = {
  id: string;
  name: string;
  entityType: string;
  states: string[];
  transitions: CustomizerTransition[];
  createdAt?: string;
  updatedAt?: string;
};

export type CustomizerWorkflowRunRow = {
  id: string;
  workflowId: string;
  workflowName?: string;
  startedAt: string;
  endedAt: string;
  status: "SUCCESS" | "FAILED";
  message?: string;
};

export type CustomizerDashboardRow = {
  id: string;
  name: string;
  layout: Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
};

type WorkflowBackend = {
  id: string;
  name: string;
  entityType?: string;
  states?: string[];
  transitions?: CustomizerTransition[];
  createdAt?: string;
  updatedAt?: string;
};

type DashboardBackend = {
  id: string;
  name: string;
  layout?: Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
};

function mapWorkflow(item: WorkflowBackend): CustomizerWorkflowRow {
  return {
    id: item.id,
    name: item.name,
    entityType: item.entityType ?? "document",
    states: item.states ?? [],
    transitions: item.transitions ?? [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapDashboard(item: DashboardBackend): CustomizerDashboardRow {
  return {
    id: item.id,
    name: item.name,
    layout: item.layout ?? [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function fetchCustomizerWorkflowsApi(): Promise<CustomizerWorkflowRow[]> {
  requireLiveApi("Customizer workflows");
  const payload = await apiRequest<{ items: WorkflowBackend[] }>("/api/settings/customizer/workflows");
  return (payload.items ?? []).map(mapWorkflow);
}

export async function createCustomizerWorkflowApi(body: {
  name: string;
  entityType: string;
  states: string[];
  transitions: CustomizerTransition[];
}): Promise<{ id: string }> {
  requireLiveApi("Create customizer workflow");
  return apiRequest<{ id: string }>("/api/settings/customizer/workflows", { method: "POST", body });
}

export async function updateCustomizerWorkflowApi(
  id: string,
  body: Partial<{ name: string; entityType: string; states: string[]; transitions: CustomizerTransition[] }>
): Promise<CustomizerWorkflowRow> {
  requireLiveApi("Update customizer workflow");
  const payload = await apiRequest<WorkflowBackend>(`/api/settings/customizer/workflows/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapWorkflow(payload);
}

export async function deleteCustomizerWorkflowApi(id: string): Promise<void> {
  requireLiveApi("Delete customizer workflow");
  await apiRequest(`/api/settings/customizer/workflows/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function executeCustomizerWorkflowApi(id: string): Promise<{ run: CustomizerWorkflowRunRow }> {
  requireLiveApi("Execute customizer workflow");
  return apiRequest<{ run: CustomizerWorkflowRunRow }>(
    `/api/settings/customizer/workflows/${encodeURIComponent(id)}/execute`,
    { method: "POST" }
  );
}

export async function fetchCustomizerWorkflowRunsApi(id: string): Promise<CustomizerWorkflowRunRow[]> {
  requireLiveApi("Customizer workflow runs");
  const payload = await apiRequest<{ items: CustomizerWorkflowRunRow[] }>(
    `/api/settings/customizer/workflows/${encodeURIComponent(id)}/runs`
  );
  return payload.items ?? [];
}

export async function fetchCustomizerDashboardsApi(): Promise<CustomizerDashboardRow[]> {
  requireLiveApi("Customizer dashboards");
  const payload = await apiRequest<{ items: DashboardBackend[] }>("/api/settings/customizer/dashboards");
  return (payload.items ?? []).map(mapDashboard);
}

export async function createCustomizerDashboardApi(body: {
  name: string;
  layout: Record<string, unknown>[];
}): Promise<{ id: string }> {
  requireLiveApi("Create customizer dashboard");
  return apiRequest<{ id: string }>("/api/settings/customizer/dashboards", { method: "POST", body });
}

export async function updateCustomizerDashboardApi(
  id: string,
  body: Partial<{ name: string; layout: Record<string, unknown>[] }>
): Promise<CustomizerDashboardRow> {
  requireLiveApi("Update customizer dashboard");
  const payload = await apiRequest<DashboardBackend>(`/api/settings/customizer/dashboards/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapDashboard(payload);
}

export async function deleteCustomizerDashboardApi(id: string): Promise<void> {
  requireLiveApi("Delete customizer dashboard");
  await apiRequest(`/api/settings/customizer/dashboards/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function publishCustomizerDashboardApi(id: string): Promise<{ id: string; published: boolean }> {
  requireLiveApi("Publish customizer dashboard");
  return apiRequest<{ id: string; published: boolean }>(
    `/api/settings/customizer/dashboards/${encodeURIComponent(id)}/publish`,
    { method: "POST" }
  );
}

export async function assignCustomizerDashboardApi(
  id: string,
  body: { roleIds: string[]; branchIds: string[] }
): Promise<{ assigned: boolean }> {
  requireLiveApi("Assign customizer dashboard");
  return apiRequest<{ assigned: boolean }>(`/api/settings/customizer/dashboards/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body,
  });
}
