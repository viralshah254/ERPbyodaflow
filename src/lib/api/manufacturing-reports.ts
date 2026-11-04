import { requireManufacturingCapability } from "./manufacturing-capabilities";
import { apiRequest, downloadFile, requireLiveApi } from "./client";
export const MANUFACTURING_REPORT_IDS = ["bom-explosion", "bom-where-used", "manufacture-orders", "work-in-progress", "reconciliation"] as const;
export type ManufacturingReportId = typeof MANUFACTURING_REPORT_IDS[number];
export type ManufacturingReportParams = { bomId?: string; productId?: string; quantity?: string; dateFrom?: string; dateTo?: string };
export type ManufacturingReport = { exportFormats?: string[]; snapshotSupport?: boolean; version: string; id: ManufacturingReportId; title: string; basis: string; generatedAt: string; columns: string[]; rows: Array<Record<string, string | number | boolean | null>>; warnings: string[]; totalWipValue?: number | null; requires?: "bomId" | "productId"; options?: Array<{ id: string; label: string }>; readOnlyPreview?: boolean };
export async function fetchManufacturingReport(id: ManufacturingReportId, params: ManufacturingReportParams = {}) {
  requireLiveApi("Manufacturing report");
  await requireManufacturingCapability("reports", "manufacturing-reports-v1");
  try {
    const report = await apiRequest<ManufacturingReport>(`/api/reports/manufacturing/${id}`, { params });
    if (report.version !== "manufacturing-reports-v1") throw new Error("Update the connected backend to use the manufacturing report contract.");
    return report;
  } catch (error) {
    if ((error as { status?: number }).status === 404) throw new Error("The API advertises manufacturing reports, but this report route was not found. Check API routing and deployment.");
    throw error;
  }
}
export function downloadManufacturingReport(id: ManufacturingReportId, params: ManufacturingReportParams, onError: (message: string) => void, format: "csv" | "pdf" | "xlsx" = "csv") {
  const search = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== "")), format });
  void downloadFile(`/api/reports/manufacturing/${id}?${search}`, `${id}.${format}`, onError);
}
