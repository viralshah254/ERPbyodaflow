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
