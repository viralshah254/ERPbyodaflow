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

export type BatchFranchisePricingUpsertItem = {
  productId: string;
  transferPrice: number;
  minRetailFloor: number;
  costPerUnit?: number;
  currency?: string;
  notes?: string;
};

/** HQ publishes mandatory outlet floors per posted GRN. Requires franchise.commission.read (same as alerts route). */
export async function upsertBatchFranchisePricingApi(payload: {
  grnId: string;
  release?: boolean;
  items: BatchFranchisePricingUpsertItem[];
}): Promise<{ ok: boolean; grnId: string; updatedCount: number; released: boolean }> {
  requireLiveApi("Franchise batch pricing upsert");
  return apiRequest<{ ok: boolean; grnId: string; updatedCount: number; released: boolean }>(
    "/api/franchise/hq/batch-franchise-pricing/upsert",
    {
      method: "POST",
      body: payload,
    }
  );
}
