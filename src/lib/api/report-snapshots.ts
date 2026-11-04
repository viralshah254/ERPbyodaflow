import { apiRequest, downloadFile } from "./client";
export type ReportSnapshotSummary = { id: string; title: string; generatedAt: string; savedAt: string; rows: number; scope: string; digest: string };
export const saveReportSnapshot = (family: "operations" | "manufacturing", reportId: string, params: Record<string, string | undefined>) => apiRequest<{ id: string; title: string; generatedAt: string; digest: string }>("/api/reports/snapshots", { method: "POST", body: { family, reportId, params } });
export const fetchReportSnapshots = () => apiRequest<{ items: ReportSnapshotSummary[] }>("/api/reports/snapshots");
export function downloadReportSnapshot(id: string, format: "pdf" | "xlsx" | "csv", onError: (message: string) => void) { return downloadFile(`/api/reports/snapshots/${encodeURIComponent(id)}?format=${format}`, `report-snapshot-${id}.${format}`, onError); }
