import {
  getMockBillLines,
  getMockGRNLines,
  getMockPOLines,
  type BillLineRow,
  type GRNLineRow,
  type POLineRow,
} from "@/lib/mock/ap-match";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

export interface ThreeWayMatchDecision {
  id: string;
  poLineIds: string[];
  grnLineIds: string[];
  billLineIds: string[];
  status: "MATCHED" | "BLOCKED";
  reason: string;
  matchedAt: string;
}

const MATCHES_KEY = "odaflow_ap_three_way_matches";

export function listPOLines(): POLineRow[] {
  return getMockPOLines().map((row) => ({ ...row }));
}

export function listGRNLines(): GRNLineRow[] {
  return getMockGRNLines().map((row) => ({ ...row }));
}

export function listBillLines(): BillLineRow[] {
  return getMockBillLines().map((row) => ({ ...row }));
}

export function listThreeWayMatches(): ThreeWayMatchDecision[] {
  return loadStoredValue(MATCHES_KEY, () => []);
}

export function createThreeWayMatch(
  poLineIds: string[],
  grnLineIds: string[],
  billLineIds: string[]
): ThreeWayMatchDecision {
  const poLines = listPOLines().filter((line) => poLineIds.includes(line.id));
  const grnLines = listGRNLines().filter((line) => grnLineIds.includes(line.id));
  const billLines = listBillLines().filter((line) => billLineIds.includes(line.id));
  const poQty = poLines.reduce((sum, line) => sum + line.quantity, 0);
  const grnQty = grnLines.reduce((sum, line) => sum + line.quantity, 0);
  const billQty = billLines.reduce((sum, line) => sum + line.quantity, 0);
  const poAmount = poLines.reduce((sum, line) => sum + line.amount, 0);
  const billAmount = billLines.reduce((sum, line) => sum + line.amount, 0);
  const qtyVariance = Math.abs(poQty - grnQty) + Math.abs(grnQty - billQty);
  const amountVariance = Math.abs(poAmount - billAmount);
  const status = qtyVariance > 0 || amountVariance > 100 ? "BLOCKED" : "MATCHED";
  const reason =
    status === "MATCHED"
      ? "Within quantity and price tolerance."
      : qtyVariance > 0
        ? "Quantity mismatch across PO, GRN, and Bill."
        : "Price mismatch exceeds tolerance.";
  const decision: ThreeWayMatchDecision = {
    id: `twm-${Date.now()}`,
    poLineIds,
    grnLineIds,
    billLineIds,
    status,
    reason,
    matchedAt: new Date().toISOString(),
  };
  saveStoredValue(MATCHES_KEY, [decision, ...listThreeWayMatches()]);
  return decision;
}

