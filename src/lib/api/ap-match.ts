import { fetchDocumentListApi } from "@/lib/api/documents";
import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { MatchableDocumentRow, ThreeWayMatchDecision } from "@/lib/types/ap-match";

function toRow(item: Awaited<ReturnType<typeof fetchDocumentListApi>>[number]): MatchableDocumentRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date,
    party: item.party,
    total: item.total,
    currency: item.currency,
    totalWeightKg: item.totalWeightKg,
    status: item.status ?? "DRAFT",
  };
}

export async function fetchMatchablePurchaseOrdersApi(): Promise<MatchableDocumentRow[]> {
  requireLiveApi("AP three-way match");
  const rows = await fetchDocumentListApi("purchase-order");
  return rows.map(toRow);
}

export async function fetchMatchableGoodsReceiptsApi(): Promise<MatchableDocumentRow[]> {
  requireLiveApi("AP three-way match");
  const rows = await fetchDocumentListApi("grn");
  return rows.map(toRow);
}

export async function fetchMatchableBillsApi(): Promise<MatchableDocumentRow[]> {
  requireLiveApi("AP three-way match");
  const rows = await fetchDocumentListApi("bill");
  return rows.map(toRow);
}

export async function fetchExistingMatchesApi(): Promise<ThreeWayMatchDecision[]> {
  requireLiveApi("AP three-way match");
  const result = await apiRequest<{ items: Array<{
    billId: string;
    billNumber?: string;
    grnId?: string;
    grnNumber?: string;
    poId?: string;
    poNumber?: string;
    matchedAt?: string;
    matchedBy?: string;
    qtyVariance?: number;
    amountVariance?: number;
    status: "MATCHED";
  }> }>("/api/ap/three-way-match", { method: "GET" });
  return (result.items ?? []).map((item) => ({
    id: item.billId,
    billId: item.billId,
    billNumber: item.billNumber,
    grnId: item.grnId ?? "",
    grnNumber: item.grnNumber,
    poId: item.poId ?? "",
    poNumber: item.poNumber,
    status: item.status,
    reason: "Matched successfully.",
    matchedAt: item.matchedAt ?? new Date().toISOString(),
    matchedBy: item.matchedBy,
    qtyVariance: item.qtyVariance,
    amountVariance: item.amountVariance,
  }));
}

export async function unmatchApi(billId: string): Promise<void> {
  requireLiveApi("AP three-way match");
  await apiRequest<{ unmatched: boolean }>("/api/ap/three-way-match/unmatch", {
    method: "POST",
    body: { billId },
  });
}

export async function createThreeWayMatchApi(input: {
  poId: string;
  grnId: string;
  billId: string;
}): Promise<ThreeWayMatchDecision> {
  requireLiveApi("AP three-way match");
  const result = await apiRequest<{ matched?: boolean; reason?: string }>("/api/ap/three-way-match", {
    method: "POST",
    body: input,
  });
  return {
    id: `twm-${Date.now()}`,
    poId: input.poId,
    grnId: input.grnId,
    billId: input.billId,
    status: result.matched ? "MATCHED" : "BLOCKED",
    reason: result.reason ?? (result.matched ? "Matched successfully." : "Blocked by backend match rules."),
    matchedAt: new Date().toISOString(),
  };
}
