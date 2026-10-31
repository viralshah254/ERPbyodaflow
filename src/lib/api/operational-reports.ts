import { apiRequest, downloadFile, requireLiveApi, getApiBase } from "./client";
export const OPERATIONAL_REPORT_IDS = ["overdue-sales-orders", "overdue-purchase-orders", "outstanding-customer-documents", "outstanding-grns", "linked-purchase-orders", "executable-orders", "lot-transactions", "slow-movers", "inventory-management", "top-sales", "sales-by-rep", "sales-vs-purchases", "sales-register", "purchase-register", "post-dated-cheques", "customer-labels", "supplier-labels"] as const;
export type OperationalReportId = typeof OPERATIONAL_REPORT_IDS[number];
export type OperationalReportParams = { dateFrom?: string; dateTo?: string; warehouseId?: string; productId?: string; partyId?: string; search?: string };
export type OperationalReport = { version: string; id: OperationalReportId; title: string; basis: string; generatedAt: string; columns: string[]; rows: Array<Record<string, string | number | boolean | null>>; warnings: string[]; metrics: Array<{ label: string; value: number | null; unit?: string; note?: string }>; links: Array<{ row: number; label: string; href: string }>; options: Record<"warehouses" | "products" | "parties", Array<{ id: string; label: string }>>; period?: { from: string; to: string }; scope: string; readOnlyPreview?: boolean };
export async function fetchOperationalReport(id: OperationalReportId, params: OperationalReportParams = {}) {
  requireLiveApi("Operational report");
  const validate = (report: OperationalReport) => { if (report.version !== "operational-reports-v1") throw new Error("The connected backend needs the operational reports release."); return report; };
  try { return validate(await apiRequest<OperationalReport>(`/api/reports/operations/${id}`, { params })); }
  catch (error) {
    if ((error as { status?: number }).status === 404 && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname) && getApiBase() !== "http://localhost:4000") return { ...validate(await apiRequest<OperationalReport>(`/api/reports/operations/${id}`, { params, baseUrl: "http://localhost:4000" })), readOnlyPreview: true };
    if ((error as { status?: number }).status === 404) throw new Error("The connected backend needs the operational reports release.");
    throw error;
  }
}
export function downloadOperationalReport(id: OperationalReportId, params: OperationalReportParams, onError: (message: string) => void) {
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== "")), format: "csv" });
  void downloadFile(`/api/reports/operations/${id}?${query}`, `${id}.csv`, onError);
}
