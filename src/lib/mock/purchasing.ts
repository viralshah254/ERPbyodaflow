/**
 * Mock purchasing data: purchase requests, purchase orders, GRNs.
 */

export interface PurchasingDocRow {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  status: string;
  poRef?: string;
  warehouse?: string;
}

const base: PurchasingDocRow[] = [
  { id: "1", number: "PO-2025-001", date: "2025-01-10", party: "Supplier A", total: 250000, status: "APPROVED" },
  { id: "2", number: "PO-2025-002", date: "2025-01-12", party: "Supplier B", total: 185000, status: "PENDING_APPROVAL" },
  { id: "3", number: "PO-2025-003", date: "2025-01-14", party: "Supplier C", total: 92000, status: "RECEIVED" },
];

export function getMockPurchaseRequests(): PurchasingDocRow[] {
  return base.map((r) => ({
    ...r,
    number: "PR-" + r.id,
    party: "Requester " + (r.party ?? ""),
    status: r.status === "RECEIVED" ? "APPROVED" : r.status,
  }));
}

export function getMockPurchaseOrders(): PurchasingDocRow[] {
  return [...base];
}

export function getMockGRNs(): PurchasingDocRow[] {
  return [
    { id: "1", number: "GRN-001", date: "2025-01-18", poRef: "PO-2025-001", warehouse: "WH-Main", status: "POSTED" },
    { id: "2", number: "GRN-002", date: "2025-01-19", poRef: "PO-2025-002", warehouse: "WH-Main", status: "DRAFT" },
    { id: "3", number: "GRN-003", date: "2025-01-20", poRef: "PO-2025-001", warehouse: "WH-East", status: "POSTED" },
  ];
}

/** Purchase returns (RMA) — same row shape as other purchasing docs. */
export function getMockPurchaseReturns(): PurchasingDocRow[] {
  return [
    { id: "1", number: "PRET-001", date: "2025-01-15", party: "Supplier A", total: 12000, status: "APPROVED", poRef: "PO-2025-001" },
    { id: "2", number: "PRET-002", date: "2025-01-16", party: "Supplier B", total: 8500, status: "DRAFT", poRef: "PO-2025-002" },
  ];
}
