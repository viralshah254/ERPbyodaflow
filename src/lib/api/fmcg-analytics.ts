import { apiRequest } from "./client";

export type FmcgAnalytics = {
  period: { from: string; to: string };
  sales: { invoiced: number; credited: number; net: number; returnsPercent: number; byDay: Array<{ day: string; invoiced: number; credited: number; net: number }> };
  customers: {
    top: Array<{ partyId: string; name: string; sales: number; returns: number; net: number; returnsPercent: number }>;
    highestReturns: Array<{ partyId: string; name: string; sales: number; returns: number; net: number; returnsPercent: number }>;
  };
  products: {
    top: Array<{ productId: string; name: string; soldQty: number; soldValue: number; returnedQty: number; returnedValue: number; returnsPercent: number }>;
    highestReturns: Array<{ productId: string; name: string; soldQty: number; soldValue: number; returnedQty: number; returnedValue: number; returnsPercent: number }>;
  };
  money: { collected: number; byMethod: Record<string, number>; owed: number; overdue: number };
  routeClose: { runs: number; closed: number; variancePending: number; notClosed: number };
  production: { produced: number; waste: number; wastePercent: number; reasons: Array<{ reason: string; qty: number }> };
  pendingWriteOffs: number;
};

export async function fetchFmcgAnalyticsApi(from: string, to: string): Promise<FmcgAnalytics> {
  return apiRequest<FmcgAnalytics>("/api/analytics/fmcg", { params: { from, to } });
}
