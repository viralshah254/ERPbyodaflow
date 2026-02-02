/**
 * Mock document lists for /docs/[type] list pages.
 */

export interface DocListRow {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  status: string;
  /** GRN */
  poRef?: string;
  warehouse?: string;
  /** Journal */
  reference?: string;
}

export function getMockDocs(type: string): DocListRow[] {
  const base: DocListRow[] = [
    { id: "1", number: "SO-2025-001", date: "2025-01-15", party: "ABC Retail", total: 125000, status: "APPROVED" },
    { id: "2", number: "SO-2025-002", date: "2025-01-16", party: "XYZ Shop", total: 85050, status: "PENDING_APPROVAL" },
    { id: "3", number: "SO-2025-003", date: "2025-01-17", party: "Global Distributors", total: 320000, status: "FULFILLED" },
  ];
  if (type === "sales-order") return base;
  if (type === "purchase-order") {
    return base.map((r) => ({
      ...r,
      number: r.number.replace("SO", "PO"),
      party: "Supplier " + (r.party ?? ""),
    }));
  }
  if (type === "grn") {
    return [
      { id: "1", number: "GRN-001", date: "2025-01-18", poRef: "PO-2025-001", warehouse: "WH-Main", status: "POSTED" },
      { id: "2", number: "GRN-002", date: "2025-01-19", poRef: "PO-2025-002", warehouse: "WH-Main", status: "DRAFT" },
    ];
  }
  if (type === "invoice") {
    return base.map((r) => ({
      ...r,
      number: "INV-" + r.id,
    }));
  }
  if (type === "journal") {
    return [
      { id: "1", number: "JE-001", date: "2025-01-15", reference: "Month-end accruals", status: "POSTED" },
      { id: "2", number: "JE-002", date: "2025-01-16", reference: "Adjustment", status: "DRAFT" },
    ];
  }
  if (type === "quote") {
    return base.map((r) => ({
      ...r,
      number: r.number.replace("SO", "QT"),
      status: r.status === "FULFILLED" ? "CONVERTED" : r.status,
    }));
  }
  if (type === "delivery-note") {
    return [
      { id: "1", number: "DN-001", date: "2025-01-18", party: "ABC Retail", total: 125000, status: "DELIVERED" },
      { id: "2", number: "DN-002", date: "2025-01-19", party: "XYZ Shop", total: 85050, status: "IN_TRANSIT" },
    ];
  }
  if (type === "purchase-request") {
    return base.map((r) => ({
      ...r,
      number: "PR-" + r.id,
      party: "Requester " + (r.party ?? ""),
    }));
  }
  if (type === "bill") {
    return base.map((r) => ({
      ...r,
      number: "BILL-" + r.id,
      party: "Supplier " + (r.party ?? ""),
    }));
  }
  return base;
}
