/**
 * Mock inter-warehouse transfers for /warehouse/transfers.
 */

export type TransferStatus = "DRAFT" | "APPROVED" | "IN_TRANSIT" | "RECEIVED";

export interface TransferLineRow {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unit?: string;
}

export interface TransferRow {
  id: string;
  number: string;
  date: string;
  fromWarehouse: string;
  toWarehouse: string;
  status: TransferStatus;
  lines: TransferLineRow[];
  createdAt?: string;
}

export const MOCK_TRANSFERS: TransferRow[] = [
  {
    id: "1",
    number: "TRF-001",
    date: "2025-01-25",
    fromWarehouse: "WH-Main",
    toWarehouse: "WH-East",
    status: "IN_TRANSIT",
    lines: [
      { id: "l1", sku: "SKU-001", productName: "Product Alpha", quantity: 30, unit: "pcs" },
      { id: "l2", sku: "SKU-002", productName: "Product Beta", quantity: 15, unit: "pcs" },
    ],
    createdAt: "2025-01-25T09:00:00Z",
  },
  {
    id: "2",
    number: "TRF-002",
    date: "2025-01-26",
    fromWarehouse: "WH-Main",
    toWarehouse: "WH-East",
    status: "APPROVED",
    lines: [{ id: "l3", sku: "SKU-001", productName: "Product Alpha", quantity: 20, unit: "pcs" }],
    createdAt: "2025-01-26T10:00:00Z",
  },
  {
    id: "3",
    number: "TRF-003",
    date: "2025-01-27",
    fromWarehouse: "WH-East",
    toWarehouse: "WH-Main",
    status: "DRAFT",
    lines: [{ id: "l4", sku: "SKU-002", productName: "Product Beta", quantity: 10, unit: "pcs" }],
    createdAt: "2025-01-27T14:00:00Z",
  },
];

export function getMockTransfers(): TransferRow[] {
  return [...MOCK_TRANSFERS];
}
