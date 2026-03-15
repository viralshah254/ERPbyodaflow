import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type TimesheetApiRow = {
  id: string;
  projectId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
};

type BackendTimesheet = {
  id: string;
  projectId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
};

export async function fetchTimesheetsApi(params?: {
  projectId?: string;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<TimesheetApiRow[]> {
  requireLiveApi("Timesheets");
  const search = new URLSearchParams();
  if (params?.projectId) search.set("projectId", params.projectId);
  if (params?.userId) search.set("userId", params.userId);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const payload = await apiRequest<{ items: BackendTimesheet[] }>("/api/timesheets", { params: search });
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    projectId: item.projectId,
    userId: item.userId,
    date: item.date.slice(0, 10),
    hours: item.hours ?? 0,
    description: item.description,
  }));
}
