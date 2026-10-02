import { apiRequest } from "./client";

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

export function fetchFmcgControlTower(params: {
  from: string;
  to: string;
}): Promise<FmcgControlTowerSnapshot> {
  return apiRequest<FmcgControlTowerSnapshot>("/api/control-tower/fmcg", { params });
}
