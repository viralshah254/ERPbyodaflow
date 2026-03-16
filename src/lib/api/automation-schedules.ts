import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type AutomationScheduleRow = {
  id: string;
  name: string;
  cron?: string;
  taskType?: string;
  enabled: boolean;
  lastRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AutomationScheduleRunRow = {
  id: string;
  startedAt: string;
  endedAt: string;
  status: "SUCCESS" | "FAILED";
  message?: string;
};

type BackendScheduleRow = {
  id: string;
  name: string;
  cron?: string;
  taskType?: string;
  enabled?: boolean;
  lastRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

function mapSchedule(item: BackendScheduleRow): AutomationScheduleRow {
  return {
    id: item.id,
    name: item.name,
    cron: item.cron,
    taskType: item.taskType,
    enabled: item.enabled ?? true,
    lastRunAt: item.lastRunAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function fetchAutomationSchedulesApi(): Promise<AutomationScheduleRow[]> {
  requireLiveApi("Automation schedules");
  const payload = await apiRequest<{ items: BackendScheduleRow[] }>("/api/automation/schedules");
  return (payload.items ?? []).map(mapSchedule);
}

export async function createAutomationScheduleApi(body: {
  name: string;
  cron?: string;
  taskType?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}): Promise<{ id: string }> {
  requireLiveApi("Create automation schedule");
  return apiRequest<{ id: string }>("/api/automation/schedules", {
    method: "POST",
    body,
  });
}

export async function updateAutomationScheduleApi(
  id: string,
  body: Partial<{ name: string; cron: string; taskType: string; enabled: boolean; config: Record<string, unknown> }>
): Promise<AutomationScheduleRow> {
  requireLiveApi("Update automation schedule");
  const payload = await apiRequest<BackendScheduleRow>(`/api/automation/schedules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapSchedule(payload);
}

export async function deleteAutomationScheduleApi(id: string): Promise<void> {
  requireLiveApi("Delete automation schedule");
  await apiRequest(`/api/automation/schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function runAutomationScheduleNowApi(id: string): Promise<{ run: AutomationScheduleRunRow }> {
  requireLiveApi("Run automation schedule now");
  return apiRequest<{ run: AutomationScheduleRunRow }>(`/api/automation/schedules/${encodeURIComponent(id)}/run-now`, {
    method: "POST",
  });
}

export async function fetchAutomationScheduleRunsApi(id: string): Promise<AutomationScheduleRunRow[]> {
  requireLiveApi("Schedule runs");
  const payload = await apiRequest<{ items: AutomationScheduleRunRow[] }>(
    `/api/automation/schedules/${encodeURIComponent(id)}/runs`
  );
  return payload.items ?? [];
}
