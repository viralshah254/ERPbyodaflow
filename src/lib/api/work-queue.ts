import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { WorkQueueItem } from "@/lib/types/work-queue";

type BackendWorkQueueItem = {
  id: string;
  category?: string;
  title?: string;
  description?: string;
  href?: string;
  severity?: string;
};

function mapSeverity(severity?: string): WorkQueueItem["severity"] {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium" || severity === "warning") return "warning";
  return "info";
}

export async function fetchWorkQueueApi(): Promise<WorkQueueItem[]> {
  requireLiveApi("Work queue");
  const payload = await apiRequest<{ items: BackendWorkQueueItem[] }>("/api/work-queue");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    category: item.category ?? "other",
    title: item.title ?? "Work queue item",
    description: item.description ?? "",
    href: item.href ?? "#",
    severity: mapSeverity(item.severity),
  }));
}

export type WorkQueueTaskRow = {
  id: string;
  category: string;
  title: string;
  description?: string;
  href?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  assigneeId?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchWorkQueueTasksApi(filters?: {
  status?: string;
  category?: string;
  assigneeId?: string;
}): Promise<WorkQueueTaskRow[]> {
  requireLiveApi("Work queue tasks");
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.category) params.category = filters.category;
  if (filters?.assigneeId) params.assigneeId = filters.assigneeId;
  const payload = await apiRequest<{ items: WorkQueueTaskRow[] }>("/api/work-queue/items", {
    params,
  });
  return payload.items ?? [];
}

export async function createWorkQueueTaskApi(payload: {
  category?: string;
  title: string;
  description?: string;
  href?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  assigneeId?: string;
  dueDate?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create work queue task");
  return apiRequest<{ id: string }>("/api/work-queue/items", {
    method: "POST",
    body: payload,
  });
}

export async function updateWorkQueueTaskApi(
  id: string,
  payload: Partial<{
    category: string;
    title: string;
    description: string;
    href: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
    assigneeId: string;
    dueDate: string;
  }>
): Promise<{ id: string; status: string; assigneeId?: string }> {
  requireLiveApi("Update work queue task");
  return apiRequest<{ id: string; status: string; assigneeId?: string }>(
    `/api/work-queue/items/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: payload,
    }
  );
}

export async function claimWorkQueueTaskApi(id: string): Promise<{ id: string; status: string }> {
  requireLiveApi("Claim work queue task");
  return apiRequest<{ id: string; status: string }>(
    `/api/work-queue/items/${encodeURIComponent(id)}/claim`,
    {
      method: "POST",
    }
  );
}

export async function completeWorkQueueTaskApi(id: string): Promise<{ id: string; status: string }> {
  requireLiveApi("Complete work queue task");
  return apiRequest<{ id: string; status: string }>(
    `/api/work-queue/items/${encodeURIComponent(id)}/complete`,
    {
      method: "POST",
    }
  );
}
