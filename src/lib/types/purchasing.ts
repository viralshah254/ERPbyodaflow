export type PurchasingDocRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
  poRef?: string;
  warehouse?: string;
  hasLandedCost?: boolean;
  processedWeightKg?: number;
};

export type GrnLineRow = {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  uom: string;
  value: number;
  receivedWeightKg?: number;
  paidWeightKg?: number;
  processedWeightKg?: number;
};

export type GrnDetailRow = PurchasingDocRow & {
  supplier?: string;
  currency?: string;
  totalAmount?: number;
  processingConfirmed?: boolean;
  sourceDocumentId?: string | null;
  lines: GrnLineRow[];
  linkedBill?: { id: string; number: string; status: string } | null;
};

export type LinkedGrnSummary = {
  id: string;
  number: string;
  status: string;
  date: string;
  total: number;
};

export type LinkedBillSummary = {
  id: string;
  number: string;
  status: string;
  /** ID of the GRN this bill was converted from. */
  grnId: string;
  grnNumber: string;
};

export type ReceivedTotals = {
  /** Total received quantity across all GRN lines. */
  qty: number;
  /** Total received weight (kg) across all GRN lines. */
  weightKg: number;
  /** Total received value across all GRN lines. */
  value: number;
};

export type PoLineReceiptRollup = {
  poLineId: string;
  receivedQty: number;
  receivedWeightKg: number;
  receivedValue: number;
};

export type PurchaseOrderDetailRow = PurchasingDocRow & {
  supplier: string;
  currency: string;
  fxRate: number;
  country: "Kenya" | "Uganda";
  region: string;
  cashMode: "CASH" | "CREDIT";
  /** GRNs received against this PO (sourceDocumentId = PO). */
  linkedGrns?: LinkedGrnSummary[];
  /** Aggregated receipt qty/value per PO line id (from GRN lines with matching sourceLineId). */
  lineReceipts?: PoLineReceiptRollup[];
  /** Totals across all GRN lines (regardless of sourceLineId). */
  receivedTotals?: ReceivedTotals;
  /** Bills converted from linked GRNs. */
  linkedBills?: LinkedBillSummary[];
  lines: Array<{
    id: string;
    /** Present when line is product-backed; used for lookups. */
    productId?: string;
    sku: string;
    productName: string;
    qty: number;
    uom: string;
    rate: number;
    total: number;
  }>;
};
