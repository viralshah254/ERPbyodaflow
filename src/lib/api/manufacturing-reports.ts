import { apiRequest, downloadFile, requireLiveApi, getApiBase } from "./client";
export const MANUFACTURING_REPORT_IDS = ["bom-explosion", "bom-where-used", "manufacture-orders", "work-in-progress"] as const;
export type ManufacturingReportId = typeof MANUFACTURING_REPORT_IDS[number];
export type ManufacturingReportParams = { bomId?: string; productId?: string; quantity?: string; dateFrom?: string; dateTo?: string };
export type ManufacturingReport = { version: string; id: ManufacturingReportId; title: string; basis: string; generatedAt: string; columns: string[]; rows: Array<Record<string, string | number | boolean | null>>; warnings: string[]; totalWipValue?: number | null; requires?: "bomId" | "productId"; options?: Array<{ id: string; label: string }>; readOnlyPreview?: boolean };
export async function fetchManufacturingReport(id: ManufacturingReportId, params: ManufacturingReportParams = {}) {
  requireLiveApi("Manufacturing report");
  try {
    const report = await apiRequest<ManufacturingReport>(`/api/reports/manufacturing/${id}`, { params });
    if (report.version !== "manufacturing-reports-v1") throw new Error("Update the connected backend to use the manufacturing report contract.");
    return report;
  } catch (error) {
    if ((error as { status?: number }).status === 404 && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname) && getApiBase() !== "http://localhost:4000") {
      const report = await apiRequest<ManufacturingReport>(`/api/reports/manufacturing/${id}`, { params, baseUrl: "http://localhost:4000" });
      if (report.version !== "manufacturing-reports-v1") throw new Error("Update the local report preview backend.");
      return { ...report, readOnlyPreview: true };
    }
    if ((error as { status?: number }).status === 404) throw new Error("The connected backend needs the manufacturing reports release before this report can run.");
    throw error;
  }
}
export function downloadManufacturingReport(id: ManufacturingReportId, params: ManufacturingReportParams, onError: (message: string) => void) {
  const search = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== "")), format: "csv" });
  void downloadFile(`/api/reports/manufacturing/${id}?${search}`, `${id}.csv`, onError);
}
