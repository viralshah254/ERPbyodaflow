import type { DocTypeKey } from "@/config/documents/types";

export type DocListRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  /** Linked GRN landed costs summed in KES (base). */
  landedAllocated?: number;
  /** Per-template landed amounts in KES (base). */
  landedBreakdown?: Array<{ label: string; amount: number }>;
  /** Invoice total + landed costs, in document currency (for dual-currency display). */
  economicTotal?: number;
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
};

export type DocumentDetailRecord = {
  id: string;
  type: DocTypeKey;
  number: string;
  date: string;
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
    convertedQuantity?: number;
    remainingQuantity?: number;
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
