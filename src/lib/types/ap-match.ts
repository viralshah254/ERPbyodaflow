export type MatchableDocumentRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  totalWeightKg?: number;
  status: string;
};

export type ThreeWayMatchDecision = {
  id: string;
  poId: string;
  poNumber?: string;
  grnId: string;
  grnNumber?: string;
  billId: string;
  billNumber?: string;
  status: "MATCHED" | "BLOCKED";
  reason: string;
  matchedAt: string;
  matchedBy?: string;
  qtyVariance?: number;
  amountVariance?: number;
};
