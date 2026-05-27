import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { PricingEngineSettings, PriceListEngineItemDto } from "@/lib/pricing/engine-types";

export async function fetchPricingEngineSettings(): Promise<{ settings: PricingEngineSettings }> {
  requireLiveApi("Pricing engine");
  return apiRequest("/api/pricing-engine/settings");
}

export async function patchPricingEngineSettings(
  body: Partial<PricingEngineSettings>
): Promise<{ settings: PricingEngineSettings }> {
  requireLiveApi("Pricing engine settings");
  return apiRequest("/api/pricing-engine/settings", { method: "PATCH", body });
}

export async function postRecalculateBatchCost(grnId: string): Promise<unknown> {
  requireLiveApi("Batch costing");
  return apiRequest(`/api/pricing-engine/batches/${encodeURIComponent(grnId)}/recalculate`, {
    method: "POST",
  });
}

export async function fetchEngineItems(priceListId: string): Promise<PriceListEngineItemDto[]> {
  requireLiveApi("Engine items");
  const res = await apiRequest<{ items: PriceListEngineItemDto[] }>(
    `/api/pricing-engine/price-lists/${encodeURIComponent(priceListId)}/engine-items`
  );
  return res.items ?? [];
}

export async function postGenerateEngineSuggestions(priceListId: string): Promise<{ updated: number }> {
  requireLiveApi("Generate pricing suggestions");
  return apiRequest(`/api/pricing-engine/price-lists/${encodeURIComponent(priceListId)}/generate`, {
    method: "POST",
  });
}

export async function postPublishEngineItem(
  itemId: string,
  body: { approvedPrice: number; overrideReason?: string; suggestedPrice?: number }
): Promise<void> {
  requireLiveApi("Publish engine price");
  await apiRequest(`/api/pricing-engine/engine-items/${encodeURIComponent(itemId)}/publish`, {
    method: "POST",
    body,
  });
}

export interface ApprovalQueueRow {
  id: string;
  priceListEngineItemId: string;
  priceListId: string;
  productId: string;
  oldPrice?: number | null;
  suggestedPrice?: number | null;
  finalCostPerKg?: number | null;
  status: string;
  createdAt?: string;
}

export async function fetchApprovalQueue(opts?: { status?: string }): Promise<ApprovalQueueRow[]> {
  requireLiveApi("Approval queue");
  const q = opts?.status ? `?status=${encodeURIComponent(opts.status)}` : "";
  const res = await apiRequest<{ items: ApprovalQueueRow[] }>(`/api/pricing-engine/approval-queue${q}`);
  return res.items ?? [];
}

export async function fetchCostBreakdown(priceListEngineItemId: string): Promise<{
  engineItem: Record<string, unknown> & { id: string; productId: string };
  batchCost?: unknown;
  productCost?: unknown;
  deliveryAllocations?: unknown[];
}> {
  requireLiveApi("Cost breakdown");
  return apiRequest(
    `/api/pricing-engine/cost-breakdown?priceListEngineItemId=${encodeURIComponent(priceListEngineItemId)}`
  );
}

/** Pricing zones (pricing workspace → price list targeting for engine / franchise minimum derivation). */
export interface PricingZoneRow {
  id: string;
  name: string;
  tier?: string;
  description?: string;
  isActive?: boolean;
}

export async function fetchPricingZones(): Promise<PricingZoneRow[]> {
  requireLiveApi("Pricing zones");
  const res = await apiRequest<{ items: PricingZoneRow[] }>("/api/pricing-engine/zones");
  return res.items ?? [];
}

export interface FranchisePricingProfileRow {
  id: string;
  franchiseId: string;
  zoneId: string;
  tier?: string;
  isActive?: boolean;
}

export async function fetchFranchisePricingProfiles(): Promise<FranchisePricingProfileRow[]> {
  requireLiveApi("Franchise pricing profiles");
  const res = await apiRequest<{ items: FranchisePricingProfileRow[] }>(
    "/api/pricing-engine/franchise-profiles"
  );
  return res.items ?? [];
}

export async function createPricingZone(body: {
  name: string;
  tier: string;
  description?: string;
}): Promise<PricingZoneRow> {
  requireLiveApi("Create pricing zone");
  return apiRequest("/api/pricing-engine/zones", { method: "POST", body });
}

export async function createFranchisePricingProfile(body: {
  franchiseId: string;
  zoneId: string;
  tier: string;
}): Promise<FranchisePricingProfileRow> {
  requireLiveApi("Create franchise pricing profile");
  return apiRequest("/api/pricing-engine/franchise-profiles", { method: "POST", body });
}
