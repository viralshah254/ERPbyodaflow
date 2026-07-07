import type { DocTypeKey } from "@/config/documents/types";

export type DocListRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  /** @deprecated Use individual landed-cost bills instead of rolled-up additional costs. */
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  isLandedCostBill?: boolean;
  costNumber?: string;
  costType?: string;
  costReference?: string;
  sourceGrnId?: string;
  sourceGrnNumber?: string;
  allocationId?: string;
  lineIndex?: number;
  costAttachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  linkedBillId?: string;
  linkedBillNumber?: string;
  linkedShipmentCosts?: Array<{
    costNumber: string;
    costType: string;
    costReference?: string;
    amount: number;
    currency: string;
    billId?: string;
    billNumber?: string;
    billStatus?: string;
    allocationId: string;
    lineIndex: number;
    attachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  }>;
  totalWeightKg?: number;
  status: string;
  poRef?: string;
  warehouse?: string;
  reference?: string;
  pendingApprovalReason?: string;
};

export type DocumentAttachmentRecord = {
  id: string;
  name: string;
  size?: string;
};

export type DocumentCommentRecord = {
  id: string;
  author: string;
  at: string;
  body: string;
};

export type DocumentTimelineEntry = {
  id: string;
  action: string;
  by: string;
  at: string;
  /** Who submitted the document for approval (when provided by API). */
  requesterBy?: string;
};

/** Who performed the action reflected in the current status (from API). */
export type DocumentStatusActor = {
  role:
    | "drafted"
    | "submitted"
    | "approved"
    | "posted"
    | "cancelled"
    | "reversed"
    | "updated";
  name: string;
};

export type PodConfirmationLineRecord = {
  lineId: string;
  qtyShipped: number;
  qtyReceived: number;
  varianceReason?: string;
  receivedWeightKg?: number;
  varianceEvidenceAttachmentIds?: string[];
};

export type FranchiseeExtraReceiptLineRecord = {
  lineId: string;
  productId?: string;
  description?: string;
  qtyReceived?: number;
  receivedWeightKg: number;
  note: string;
};

export type FranchiseeWeightSplitLineRecord = {
  productId?: string;
  variantId?: string;
  description: string;
  weightKg: number;
  note?: string;
};

export type FranchiseeWeightSplitReportRecord = {
  referenceTotalWeightKg: number;
  lines: FranchiseeWeightSplitLineRecord[];
  splitNote?: string;
};

export type PodConfirmationRecord = {
  confirmedAt: string;
  confirmedByUserId?: string;
  receiverName?: string;
  /** Optional contact captured at delivery (e.g. mobile POD). */
  receiverPhone?: string;
  /** Attachment on the delivery note (signature image). */
  receiverSignatureAttachmentId?: string;
  /** Delivery driver at drop-off (mobile POD). */
  dispatcherName?: string;
  dispatcherSignatureAttachmentId?: string;
  note?: string;
  lines: PodConfirmationLineRecord[];
  extraReceiptLines?: FranchiseeExtraReceiptLineRecord[];
  franchiseeWeightSplit?: FranchiseeWeightSplitReportRecord;
};

/** Driver pickup at collection / processing (before IN_TRANSIT). */
export type DispatchPickupLineRecord = {
  lineId: string;
  loadedWeightKg: number;
  varianceReason?: string;
};

export type DispatchPickupRecord = {
  dispatchedAt: string;
  dispatchedByUserId?: string;
  dispatcherName: string;
  signatureAttachmentId: string;
  lines: DispatchPickupLineRecord[];
};

export type DeliveryCheckInRecord = {
  checkedInAt: string;
  checkedInByUserId?: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  withinGeofence: boolean;
  geofenceRadiusM: number;
};

export type WarehouseDropLineRecord = {
  lineId: string;
  droppedWeightKg: number;
  varianceReason?: string;
};

export type WarehouseDropRecord = {
  droppedAt: string;
  droppedByUserId?: string;
  dispatcherName: string;
  signatureAttachmentId: string;
  warehouseId: string;
  note?: string;
  lines: WarehouseDropLineRecord[];
  draftGrnId?: string;
  receivedAt?: string;
  receivedByUserId?: string;
};

export type DocumentDetailRecord = {
  id: string;
  type: DocTypeKey;
  number: string;
  date: string;
  /** Present when the API could resolve a user for the current status. */
  statusActor?: DocumentStatusActor | null;
  /** Resolved creator display name (when distinct from status actor). */
  createdByName?: string;
  partyId?: string;
  party?: string;
  branchId?: string;
  warehouseId?: string;
  total?: number;
  currency: string;
  exchangeRate?: number;
  status: string;
  availableActions?: Array<"submit" | "approve" | "post" | "cancel" | "reverse">;
  availableConversionTargets?: DocTypeKey[];
  outputTemplateId?: string;
  lines: Array<{
    id?: string;
    description: string;
    qty?: number;
    unit?: string;
    unitPrice?: number;
    amount?: number;
    tax?: number;
    productId?: string;
    productName?: string;
    productSku?: string;
    accountId?: string;
    accountName?: string;
    accountCode?: string;
    sourceDocumentId?: string;
    sourceDocumentType?: DocTypeKey;
    sourceLineId?: string;
    sourceQuantity?: number;
    orderedQuantity?: number;
    shippedQuantity?: number;
    backorderQuantity?: number;
    fulfilmentStatus?: "SHIPPED" | "NOT_PACKED" | "PARTIALLY_PACKED";
    fulfilmentReasonCode?: string;
    fulfilmentReason?: string;
    convertedQuantity?: number;
    remainingQuantity?: number;
    taxCodeId?: string;
    /** Resolved line tax or product default when line has no explicit code. */
    effectiveTaxCodeId?: string;
    taxCodeCode?: string;
    taxCodeName?: string;
    taxRate?: number;
    /** Line gross weight shipped (delivery-note POD baseline). */
    weightKg?: number;
    receivedWeightKg?: number;
    orderedWeightKg?: number;
    receiptVarianceKg?: number;
    paidWeightKg?: number;
    paidVarianceKg?: number;
    varianceReasonCode?: string;
    varianceReason?: string;
  }>;
  sourceDocument?: {
    id: string;
    typeKey: DocTypeKey;
    number: string;
    status: string;
    date: string;
  } | null;
  linkedDeliveries?: Array<{ id: string; number: string; status: string }>;
  relatedDocuments?: Array<{
    id: string;
    typeKey: DocTypeKey;
    number: string;
    status: string;
    date: string;
    total?: number;
  }>;
  attachments: DocumentAttachmentRecord[];
  comments: DocumentCommentRecord[];
  approvalHistory: DocumentTimelineEntry[];
  auditHistory: DocumentTimelineEntry[];
  emailedAt?: string;
  emailedTo?: string;
  notes?: string;
  dueDate?: string;
  paymentStatus?: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  paidAmount?: number;
  openAmount?: number;
  isOverdue?: boolean;
  documentChain?: DocumentChainNode[];
  /** Proof of delivery (delivery-note only). */
  podConfirmation?: PodConfirmationRecord;
  /** Driver pickup / collection weights (delivery-note only). */
  dispatchPickup?: DispatchPickupRecord;
  deliveryCheckIn?: DeliveryCheckInRecord;
  warehouseDrop?: WarehouseDropRecord;
  /** Admin can amend in-transit dispatch when allowed (delivery-note only). */
  dispatchAmendEligibility?: { allowed: boolean; reason?: string };
};

export type DocumentChainNode = {
  id: string;
  number: string;
  typeKey: string;
  status: string;
  total?: number;
  date?: string;
  children: DocumentChainNode[];
};
