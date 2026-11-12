export type TransferStatus = "DRAFT" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface TransferLineRow {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unit?: string;
  enteredQuantity?: number;
  enteredUom?: string;
  uomFactor?: number;
  receivedQuantity?: number;
  receiptVarianceKg?: number;
  receiptExceptionReason?: string;
  shortageReportRecorded?: boolean;
  transitLots?: Array<{ lotId: string; lotNumber: string; quantity: number }>;
  missingLots?: Array<{ lotId: string; quantity: number }>;
  shortageValue?: number;
  shortageJournalId?: string;
  lotNumbers?: string[];
}

export interface TransferRow {
  id: string;
  number: string;
  date: string;
  fromWarehouse: string;
  toWarehouse: string;
  status: TransferStatus;
  lines: TransferLineRow[];
  reference?: string;
  transitWarehouse?: string;
  reviewVersion?: string;
  shortageApprovedBy?: string;
  shortageReporterIsCurrentUser?: boolean;
  createdBy?: string;
  activity?: Array<{ id: string; action: string; by?: string; at: string; note?: string }>;
  movements?: Array<{ id: string; type: string; warehouse: string; productName: string; quantity: number; unit?: string; by?: string; at: string }>;
  createdAt?: string;
  receivedAt?: string;
}
