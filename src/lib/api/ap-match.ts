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
