import { apiRequest, requireLiveApi } from "./client";

export type FranchiseOutletSellPublishAlertRow = {
  priceListId: string;
  priceListName?: string;
  outletCount: number;
  pendingProductCount: number;
  pendingProductSampleIds: string[];
};

export async function fetchFranchiseOutletSellPublishAlerts(): Promise<{
  items: FranchiseOutletSellPublishAlertRow[];
  todayISO: string;
  generatedAt?: string;
}> {
  requireLiveApi("Outlet sell publish alerts");
  return apiRequest<{ items: FranchiseOutletSellPublishAlertRow[]; todayISO: string; generatedAt?: string }>(
    "/api/franchise/hq/outlet-sell-publish/alerts"
  );
}

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

export async function assignOutletPricingZone(
  outletOrgId: string,
  zoneId: string
): Promise<{
  outletOrgId: string;
  zoneId: string;
  profileId: string | null;
  priceListId: string | null;
  parentPriceListId: string | null;
}> {
  requireLiveApi("Outlet zone assignment");
  return apiRequest(`/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/zone`, {
    method: "PATCH",
    body: { zoneId },
  });
}

export type OutletRetailPricePreviewRow = {
  productId: string;
  sku?: string;
  productName: string;
  zoneBasePrice: number | null;
  commissionPerUnit: number;
  retailPrice: number | null;
  source: string | null;
  currency: string;
  eligible: boolean;
};

export async function fetchOutletRetailPricePreview(
  outletOrgId: string,
  date?: string
): Promise<{
  outletOrgId: string;
  outletName?: string;
  priceListId: string | null;
  priceListName: string | null;
  priceListValid?: boolean;
  zoneMasterPriceListId?: string | null;
  effectiveDate: string;
  items: OutletRetailPricePreviewRow[];
}> {
  requireLiveApi("Outlet retail price preview");
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiRequest(
    `/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/retail-prices/preview${qs}`
  );
}

export type PriceListOutletRow = {
  outletOrgId: string;
  outletName: string;
  assignmentType: "direct" | "derived";
};

export async function fetchOutletsForPriceList(priceListId: string): Promise<{ items: PriceListOutletRow[] }> {
  requireLiveApi("Price list outlets");
  return apiRequest(`/api/franchise/hq/price-lists/${encodeURIComponent(priceListId)}/outlets`);
}
