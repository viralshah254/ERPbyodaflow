/**
 * Mock sales data: quotes, orders, deliveries, invoices.
 */

export interface SalesDocRow {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  status: string;
}

const base: SalesDocRow[] = [
  { id: "1", number: "SO-2025-001", date: "2025-01-15", party: "ABC Retail", total: 125000, status: "APPROVED" },
  { id: "2", number: "SO-2025-002", date: "2025-01-16", party: "XYZ Shop", total: 85050, status: "PENDING_APPROVAL" },
  { id: "3", number: "SO-2025-003", date: "2025-01-17", party: "Global Distributors", total: 320000, status: "FULFILLED" },
];

export function getMockQuotes(): SalesDocRow[] {
  return base.map((r) => ({
    ...r,
    number: r.number.replace("SO", "QT"),
    status: r.status === "FULFILLED" ? "CONVERTED" : r.status,
  }));
}

export function getMockSalesOrders(): SalesDocRow[] {
  return [...base];
}

export function getMockDeliveries(): SalesDocRow[] {
  return [
    { id: "1", number: "DN-001", date: "2025-01-18", party: "ABC Retail", total: 125000, status: "DELIVERED" },
    { id: "2", number: "DN-002", date: "2025-01-19", party: "XYZ Shop", total: 85050, status: "IN_TRANSIT" },
  ];
}

export function getMockInvoices(): SalesDocRow[] {
  return base.map((r) => ({
    ...r,
    number: "INV-" + r.id,
  }));
}
