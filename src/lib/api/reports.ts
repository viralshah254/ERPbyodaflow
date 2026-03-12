import {
  getMockExportHistory,
  getMockScheduledReports,
  type ExportHistoryRow,
  type ScheduledReportRow,
} from "@/lib/mock/reports";
import { apiRequest, downloadTextFile, isApiConfigured } from "./client";

type BackendScheduledReport = {
  id: string;
  reportId: string;
  name?: string;
  cron?: string;
  recipients?: string[];
  isActive: boolean;
  lastRunAt?: string;
  createdAt?: string;
};

export async function fetchScheduledReportsApi(): Promise<ScheduledReportRow[]> {
  if (!isApiConfigured()) {
    return getMockScheduledReports();
  }
  const data = await apiRequest<{ items: BackendScheduledReport[] }>("/api/reports/scheduled");
  return data.items.map((item) => ({
    id: item.id,
    name: item.name ?? item.reportId,
    reportType: item.reportId,
    frequency: item.cron?.includes("day")
      ? "daily"
      : item.cron?.includes("week")
        ? "weekly"
        : "monthly",
    nextRun: item.lastRunAt ?? item.createdAt ?? new Date().toISOString(),
    recipients: (item.recipients ?? []).join(", "),
    enabled: item.isActive,
  }));
}

type BackendReportExport = {
  id: string;
  reportId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt?: string;
};

type BackendReportExportDetail = {
  id: string;
  reportId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt?: string;
  result?: unknown;
  errorMessage?: string;
};

function mapExportStatus(status: BackendReportExport["status"]): ExportHistoryRow["status"] {
  if (status === "COMPLETED") return "completed";
  if (status === "FAILED") return "failed";
  return "pending";
}

export async function fetchReportExportsApi(): Promise<ExportHistoryRow[]> {
  if (!isApiConfigured()) {
    return getMockExportHistory();
  }
  const data = await apiRequest<{ items: BackendReportExport[] }>("/api/reports/exports");
  return data.items.map((item) => ({
    id: item.id,
    name: item.reportId,
    format: "csv",
    createdAt: item.createdAt,
    status: mapExportStatus(item.status),
    size: item.completedAt ? "Generated" : undefined,
  }));
}

export async function runReportExportApi(reportId = "vat-summary"): Promise<void> {
  if (!isApiConfigured()) {
    return;
  }
  await apiRequest("/api/reports/run", {
    method: "POST",
    body: { reportId },
  });
}

export async function downloadReportExportApi(row: ExportHistoryRow): Promise<void> {
  if (!isApiConfigured()) {
    downloadTextFile(
      `${row.name.replaceAll(" ", "-").toLowerCase()}.${row.format}`,
      `Report export\nName: ${row.name}\nFormat: ${row.format}\nCreated: ${row.createdAt}`
    );
    return;
  }
  const detail = await apiRequest<BackendReportExportDetail>(`/api/reports/export/${row.id}`);
  downloadTextFile(
    `${detail.reportId}-${detail.id}.json`,
    JSON.stringify(
      {
        reportId: detail.reportId,
        createdAt: detail.createdAt,
        completedAt: detail.completedAt,
        result: detail.result,
        errorMessage: detail.errorMessage,
      },
      null,
      2
    ),
    "application/json;charset=utf-8"
  );
}
