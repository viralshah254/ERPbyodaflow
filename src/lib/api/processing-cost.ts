/**
 * Processing cost API client.
 * Formula-driven costs: processing fee, packaging, outbound logistics.
 */
import { apiRequest } from "@/lib/api/client";

export type ProcessingCostCategory = "processing_fee" | "packaging" | "outbound_logistics";
export type ProcessingType = "filleting" | "sun_drying" | "gutting" | "manual";

export interface ProcessingCostDraftLine {
  category: ProcessingCostCategory;
  label: string;
  amount: number;
  currency: string;
  ratePerUnit?: number;
  rateUnit?: "per_kg" | "per_box" | "per_sack" | "fixed";
  basisQty?: number;
  isOverride: boolean;
}

export interface ProcessingCostDraftResult {
  processingType: string;
  inputMetrics: {
    totalQtyKg: number;
    boxCount?: number;
    sackCount?: number;
  };
  profileVersion: string;
  lines: ProcessingCostDraftLine[];
  totalAmount: number;
}

export interface ProcessingCostProfile {
  _version: string;
  _source?: string;
  inboundLogistics: {
    breakdownPerShipment: {
      carHire: number;
      fuel: number;
      driverAllowance: number;
      turnboyAllowance: number;
      supervisorAllowance: number;
    };
    totalPerShipment: number;
    referenceLoadKg: number;
    perKgApprox: number;
  };
  packaging: {
    boxCapacityKg: number;
    costPerBoxKes: number;
    polythenePerBoxKes: number;
    strapsPerBoxKes: number;
    costPerSackKes: number;
    filletYieldFraction: number;
    frameYieldFraction: number;
    packagingPerInputKgKes: number;
    outboundPerInputKgKes: number;
  };
  processing: {
    filleting: { feePerKgKes: number; outboundPerInputKgKes: number };
    sun_drying: { feePerKgKes: number; outboundPerInputKgKes: number };
    gutting: { feePerKgKes: number; outboundPerInputKgKes: number };
    manual: { feePerKgKes: number; outboundPerInputKgKes: number };
  };
}

export interface ProcessingCostAllocationRecord {
  _id: string;
  orgId: string;
  sourceId: string;
  sourceType: string;
  processingType: ProcessingType;
  lines: ProcessingCostDraftLine[];
  formulaSnapshot: {
    profileVersion: string;
    computedAt: string;
    processingType: string;
    inputMetrics: { totalQtyKg: number; boxCount?: number; sackCount?: number };
  };
  totalAmount: number;
  impactLines?: Array<{ productId: string; basisValue: number; allocatedAmount: number }>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProcessingCostProfile(): Promise<ProcessingCostProfile | null> {
  try {
    const res = await apiRequest<{ profile: ProcessingCostProfile }>(
      "/api/inventory/processing-cost/profile"
    );
    return res?.profile ?? null;
  } catch {
    return null;
  }
}

export async function patchProcessingCostProfile(
  patch: Partial<ProcessingCostProfile>
): Promise<ProcessingCostProfile> {
  const res = await apiRequest<{ profile: ProcessingCostProfile }>(
    "/api/inventory/processing-cost/profile",
    { method: "PATCH", body: patch }
  );
  return res.profile;
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export async function fetchProcessingCostDraft(
  sourceId: string,
  processingType: ProcessingType
): Promise<{ draft: ProcessingCostDraftResult; source: { id: string; number: string; totalQtyKg: number } } | null> {
  try {
    const params = new URLSearchParams({ sourceId, processingType });
    return await apiRequest(`/api/inventory/processing-cost/draft?${params.toString()}`);
  } catch {
    return null;
  }
}

// ─── Allocation ───────────────────────────────────────────────────────────────

export async function fetchProcessingCostAllocation(
  sourceId: string
): Promise<ProcessingCostAllocationRecord | null> {
  try {
    const res = await apiRequest<{ allocation: ProcessingCostAllocationRecord | null }>(
      `/api/inventory/processing-cost/allocation/${encodeURIComponent(sourceId)}`
    );
    return res?.allocation ?? null;
  } catch {
    return null;
  }
}

export async function saveProcessingCostAllocation(body: {
  sourceId: string;
  processingType: ProcessingType;
  lines: Array<{
    category: ProcessingCostCategory;
    label: string;
    amount: number;
    currency?: string;
    ratePerUnit?: number;
    rateUnit?: string;
    basisQty?: number;
    isOverride?: boolean;
  }>;
  formulaSnapshot?: ProcessingCostDraftResult;
}): Promise<{ id: string; processingType: ProcessingType; totalAmount: number }> {
  return apiRequest("/api/inventory/processing-cost/allocation", {
    method: "POST",
    body,
  });
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const PROCESSING_TYPE_LABELS: Record<ProcessingType, string> = {
  filleting: "Filleting",
  sun_drying: "Sun drying",
  gutting: "Gutting",
  manual: "Manual (custom)",
};

export const PROCESSING_COST_CATEGORY_LABELS: Record<ProcessingCostCategory, string> = {
  processing_fee: "Processing fee",
  packaging: "Packaging materials",
  outbound_logistics: "Outbound logistics",
};
