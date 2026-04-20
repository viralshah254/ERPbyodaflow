/**
 * Batch landed cost summary API.
 * Aggregates all cost layers for a GRN batch into a single total landed cost.
 *
 * Flow: Farm (PO/GRN) → Gutting point (ProcessingCostAllocation) → Stores (Transfer)
 */

import { apiRequest } from "@/lib/api/client";

export interface BatchCostLayers {
  purchaseValue: number;
  fxLoss: number;
  permits: number;
  inboundLogistics: number;
  otherLanded: number;
  processingFee: number;
  packaging: number;
  outboundLogistics: number;
  transferCost: number;
}

export interface BatchCostTransferDetail {
  id: string;
  number: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  costKes: number;
  notes?: string;
}

export interface BatchCostSummary {
  grnId: string;
  grnNumber: string;
  poNumber?: string;
  receivedKg: number;
  purchaseCurrency: string;
  fxRate: number;
  layers: BatchCostLayers;
  totalLandedCostKes: number;
  /** Cost per kg in KES. Null when receivedKg is 0. */
  perKg: number | null;
  processingType?: string;
  hasLandedCostAllocation: boolean;
  hasProcessingCostAllocation: boolean;
  transferDetails: BatchCostTransferDetail[];
}

export async function fetchBatchCostSummary(grnId: string): Promise<BatchCostSummary | null> {
  try {
    const params = new URLSearchParams({ grnId });
    return await apiRequest<BatchCostSummary>(`/api/inventory/batch-cost-summary?${params.toString()}`);
  } catch {
    return null;
  }
}
