export type MatchableDocumentRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  status: string;
};

export type ThreeWayMatchDecision = {
  id: string;
  poId: string;
  grnId: string;
  billId: string;
  status: "MATCHED" | "BLOCKED";
  reason: string;
  matchedAt: string;
};
