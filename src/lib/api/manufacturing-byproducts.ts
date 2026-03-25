/**
 * Byproduct inventory API.
 * Backed by GET /api/manufacturing/byproducts (manufacturing-byproducts route).
 */
import { apiRequest, requireLiveApi } from "@/lib/api/client";

export interface ByproductRow {
  productId: string;
  sku: string;
  productName: string;
  qtyKg: number;
  reservedKg: number;
  availableKg: number;
  unitCost: number | null;
  warehouseId: string | null;
  warehouse: string | null;
}

export interface ByproductYieldSummary {
  batchCount: number;
  totalInputKg: number;
  totalPrimaryKg: number;
  totalSecondaryKg: number;
  totalWasteKg: number;
  totalYieldPct: number;
  primaryPct: number;
  secondaryPct: number;
  wastePct: number;
}

export interface ByproductInventoryResponse {
  items: ByproductRow[];
  yieldSummary: ByproductYieldSummary | null;
}

export async function fetchByproductInventory(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ByproductInventoryResponse> {
  requireLiveApi("Byproduct inventory");
  const q: Record<string, string> = {};
  if (params?.dateFrom) q.dateFrom = params.dateFrom;
  if (params?.dateTo)   q.dateTo   = params.dateTo;
  return apiRequest<ByproductInventoryResponse>("/api/manufacturing/byproducts", {
    params: Object.keys(q).length ? q : undefined,
  });
}
