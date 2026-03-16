import { type ExportHistoryRow, type ScheduledReportRow, type SavedViewRow } from "@/lib/types/reports";
import { apiRequest, downloadFile, downloadTextFile, isApiConfigured, requireLiveApi } from "./client";

type BackendReportLibraryItem = {
  id: string;
  name: string;
};

type BackendSavedView = {
  id: string;
  name: string;
};

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
  requireLiveApi("Scheduled reports");
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

export async function fetchSavedReportViewsApi(): Promise<SavedViewRow[]> {
  requireLiveApi("Saved report views");
  const data = await apiRequest<{ items: BackendSavedView[] }>("/api/reports/saved");
  return data.items.map((item) => ({
    id: item.id,
    name: item.name,
    reportType: "saved-view",
    filters: "Saved backend view",
    lastRun: "—",
  }));
}

export async function fetchReportLibraryApi(): Promise<Array<{ id: string; name: string; description: string; category: string }>> {
  requireLiveApi("Report library");
  const data = await apiRequest<{ items: BackendReportLibraryItem[] }>("/api/reports");
  return data.items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.name,
    category: item.id.includes("commission") ? "sales" : "finance",
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
  requireLiveApi("Report exports");
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
  requireLiveApi("Run report export");
  await apiRequest("/api/reports/run", {
    method: "POST",
    body: { reportId },
  });
}

export async function fetchVatSummaryApi(input?: { dateFrom?: string; dateTo?: string }): Promise<{
  dateFrom?: string;
  dateTo?: string;
  totalVat: number;
  invoiceCount: number;
}> {
  requireLiveApi("VAT summary");
  const params = new URLSearchParams();
  if (input?.dateFrom) params.set("dateFrom", input.dateFrom);
  if (input?.dateTo) params.set("dateTo", input.dateTo);
  return apiRequest("/api/reports/vat-summary", { params });
}

export async function fetchWhtSummaryApi(input?: { dateFrom?: string; dateTo?: string }): Promise<{
  dateFrom?: string;
  dateTo?: string;
  totalWht: number;
  billCount: number;
}> {
  requireLiveApi("WHT summary");
  const params = new URLSearchParams();
  if (input?.dateFrom) params.set("dateFrom", input.dateFrom);
  if (input?.dateTo) params.set("dateTo", input.dateTo);
  return apiRequest("/api/reports/wht-summary", { params });
}

export type CommissionReconciliationRow = {
  runId: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  runStatus: string;
  salesBase: number;
  commissionAmount: number;
  topUpAmount: number;
  totalPayout: number;
  commissionJournalId: string | null;
  topUpJournalIds: string[];
  paymentSettlementStatus: string;
};

export async function fetchCommissionReconciliationApi(input?: {
  dateFrom?: string;
  dateTo?: string;
  status?: "DRAFT" | "POSTED" | "ALL";
}): Promise<CommissionReconciliationRow[]> {
  requireLiveApi("Commission reconciliation");
  const params = new URLSearchParams();
  if (input?.dateFrom) params.set("dateFrom", input.dateFrom);
  if (input?.dateTo) params.set("dateTo", input.dateTo);
  if (input?.status && input.status !== "ALL") params.set("status", input.status);
  const payload = await apiRequest<{ items: CommissionReconciliationRow[] }>("/api/reports/cool-catch/commission-reconciliation", {
    params,
  });
  return payload.items ?? [];
}

export function downloadCommissionReconciliationCsvApi(onError: (message: string) => void): void {
  requireLiveApi("Commission reconciliation export");
  downloadFile("/api/reports/cool-catch/commission-reconciliation?format=csv", "commission-reconciliation.csv", onError);
}

export function downloadTaxSummaryCsvApi(
  reportId: "vat-summary" | "wht-summary",
  filename: string,
  onError: (message: string) => void
): void {
  requireLiveApi(`${reportId} export`);
  downloadFile(`/api/reports/${reportId}?format=csv`, filename, onError);
}

export async function downloadReportExportApi(row: ExportHistoryRow): Promise<void> {
  requireLiveApi("Report export detail");
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
