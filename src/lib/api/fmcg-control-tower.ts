import { apiRequest, getApiBase } from "./client";

export type FmcgControlTowerException = {
  id: string;
  category: "DOCUMENT" | "QUALITY" | "PRODUCTION" | "AUTOMATION" | "FINANCE";
  severity: "critical" | "warning";
  title: string;
  detail: string;
  occurredAt: string;
  href: string;
};

export type FmcgControlTowerSnapshot = {
  generatedAt: string;
  range: { from: string; to: string };
  metrics: {
    salesOrders: number;
    openSalesOrders: number;
    postedRevenue: number;
    postedInvoices: number;
    quarantinedLots: number;
    pendingQcLots: number;
    expiringLots: number;
    activeWorkOrders: number;
    workOrderVariances: number;
    automationDeadLetters: number;
    unmatchedBankLines: number;
    unmatchedBankAmount: number;
    overdueOpenPeriods: number;
  };
  exceptions: FmcgControlTowerException[];
};

export async function fetchFmcgControlTower(params: {
  from: string;
  to: string;
}): Promise<FmcgControlTowerSnapshot> {
  const path = "/api/control-tower/fmcg";
  const request = { params };
  try {
    return await apiRequest<FmcgControlTowerSnapshot>(path, request);
  } catch (error) {
    const status = (error as { status?: number }).status;
    const local = "http://localhost:4000";
    const onLocalPage =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (status === 404 && onLocalPage && getApiBase() !== local) {
      return apiRequest<FmcgControlTowerSnapshot>(path, { ...request, baseUrl: local });
    }
    throw error;
  }
}
