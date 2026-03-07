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

/** GRN line with optional weight (Cool Catch cash-to-weight). */
export interface GrnLineRow {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  uom: string;
  value: number;
  receivedWeightKg?: number;
  paidWeightKg?: number;
}

/** GRN detail with lines (for receipt detail page and cash-to-weight). */
export interface GrnDetailRow extends PurchasingDocRow {
  supplier?: string;
  currency?: string;
  totalAmount?: number;
  lines: GrnLineRow[];
}

const MOCK_GRN_DETAILS: Record<string, Omit<GrnDetailRow, "lines"> & { lines: GrnLineRow[] }> = {
  "1": {
    id: "1",
    number: "GRN-001",
    date: "2025-01-18",
    poRef: "PO-2025-001",
    warehouse: "WH-Main",
    status: "POSTED",
    party: "Supplier A",
    supplier: "Supplier A",
    total: 85000,
    totalAmount: 85000,
    currency: "KES",
    lines: [
      { id: "l1", sku: "SKU-001", productName: "Product Alpha", qty: 100, uom: "pcs", value: 50000, receivedWeightKg: 98.5, paidWeightKg: 100 },
      { id: "l2", sku: "SKU-002", productName: "Product Beta", qty: 50, uom: "pcs", value: 35000, receivedWeightKg: 49, paidWeightKg: 50 },
    ],
  },
  "2": {
    id: "2",
    number: "GRN-002",
    date: "2025-01-19",
    poRef: "PO-2025-002",
    warehouse: "WH-Main",
    status: "DRAFT",
    party: "Supplier B",
    supplier: "Supplier B",
    total: 120000,
    totalAmount: 120000,
    currency: "UGX",
    lines: [
      { id: "l1", sku: "ROUND-001", productName: "Round Fish", qty: 500, uom: "kg", value: 80000 },
      { id: "l2", sku: "ROUND-002", productName: "Round Fish (small)", qty: 200, uom: "kg", value: 40000, receivedWeightKg: 195 },
    ],
  },
  "3": {
    id: "3",
    number: "GRN-003",
    date: "2025-01-20",
    poRef: "PO-2025-001",
    warehouse: "WH-East",
    status: "POSTED",
    party: "Supplier A",
    supplier: "Supplier A",
    total: 42000,
    totalAmount: 42000,
    currency: "KES",
    lines: [
      { id: "l1", sku: "SKU-001", productName: "Product Alpha", qty: 40, uom: "pcs", value: 20000, receivedWeightKg: 39.2 },
    ],
  },
};

export function getMockGRNById(id: string): GrnDetailRow | null {
  const row = MOCK_GRN_DETAILS[id];
  if (!row) return null;
  return { ...row, lines: [...row.lines] };
}

/** Purchase returns (RMA) — same row shape as other purchasing docs. */
export function getMockPurchaseReturns(): PurchasingDocRow[] {
  return [
    { id: "1", number: "PRET-001", date: "2025-01-15", party: "Supplier A", total: 12000, status: "APPROVED", poRef: "PO-2025-001" },
    { id: "2", number: "PRET-002", date: "2025-01-16", party: "Supplier B", total: 8500, status: "DRAFT", poRef: "PO-2025-002" },
  ];
}
