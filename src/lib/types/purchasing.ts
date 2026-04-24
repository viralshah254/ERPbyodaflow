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
  /** Sum of receivedWeightKg across all GRN lines — fish weight received at the facility. */
  receivedWeightKg?: number;
  /** Sum of processedWeightKg across all GRN lines — weight after processing/sorting. */
  processedWeightKg?: number;
  /** Per-line availability for the subcontracting form (present when ?availableForProcessing=true). */
  lineAvailability?: Array<{
    lineIndex: number;
    /** Product ID of the GRN line — used for product-aware BOM matching. */
    productId?: string;
    productName: string;
    sku: string;
    receivedWeightKg: number;
    available: boolean;
    /** Why this line is unavailable: "already_processed" | "no_weight" */
    unavailableReason?: string;
  }>;
  /** Count of lines still eligible for processing (available + positive weight). */
  eligibleLineCount?: number;
  /** Work order this GRN batch is being processed in (set once a WO is linked). */
  workOrderId?: string;
  workOrderNumber?: string;
  /** DRAFT | RELEASED | IN_PROGRESS | COMPLETED | CANCELLED */
  workOrderStatus?: string;
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
  warehouseId?: string;
  lines: GrnLineRow[];
  linkedBill?: { id: string; number: string; status: string } | null;
  // Work order link (inherited via PurchasingDocRow but repeated here for clarity)
};

export type LinkedGrnSummary = {
  id: string;
  number: string;
  status: string;
  date: string;
  total: number;
  /** Sum of receivedWeightKg across all GRN lines (populated by PO detail endpoint). */
  receivedWeightKg?: number;
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
