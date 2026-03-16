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
  receivedAt?: string;
}
