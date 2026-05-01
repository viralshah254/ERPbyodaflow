import { apiRequest, requireLiveApi } from "./client";

export type FranchiseBatchPricingAlertRow = {
  grnId: string;
  grnNumber?: string;
  date?: string;
  pendingProductCount: number;
  pendingProductSampleIds: string[];
};

export async function fetchFranchiseBatchPricingAlerts(): Promise<{
  items: FranchiseBatchPricingAlertRow[];
}> {
  requireLiveApi("Franchise batch pricing");
  return apiRequest<{ items: FranchiseBatchPricingAlertRow[] }>(
    "/api/franchise/hq/batch-franchise-pricing/alerts"
  );
}
