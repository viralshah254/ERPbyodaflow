export type DocumentHubStatus =
  | "new_upload"
  | "processing"
  | "awaiting_classification"
  | "matched"
  | "ready_for_approval"
  | "auto_processed"
  | "exceptions"
  | "unallocated_payments"
  | "completed";

export interface HubFlag {
  code: string;
  severity: "information" | "warning" | "critical";
  message: string;
}

export interface HubMatch {
  candidateId: string;
  typeKey: string;
  number: string;
  level: "exact" | "strong" | "suggested" | "unmatched";
  confidence: number;
  reasons: string[];
  differences: string[];
}

export interface HubAllocationLine {
  invoiceId?: string;
  invoiceNumber: string;
  amount: number;
  confidence: number;
  reason: string;
}

export interface HubAllocation {
  faceValue: number;
  allocated: number;
  unapplied: number;
  lines: HubAllocationLine[];
  flags: HubFlag[];
  reconciles: boolean;
}

export interface HubExtractedLine {
  description: string;
  quantity?: number;
  uom?: string;
  unitPrice?: number;
  amount?: number;
  itemCode?: string;
  productId?: string;
  physicalQuantity?: number;
}

export interface HubFields {
  partyName?: string;
  partyId?: string;
  taxPin?: string;
  documentNumber?: string;
  documentDate?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  poReference?: string;
  deliveryNoteNumber?: string;
  invoiceNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  payee?: string;
  paymentReference?: string;
  mpesaCode?: string;
  dueDate?: string;
  lines: HubExtractedLine[];
  partySuggestions?: Array<{ id: string; name: string }>;
}

export interface ScannedDocument {
  _id: string;
  fileId: string;
  fileName: string;
  contentType?: string;
  fileUrl?: string;
  ocrSource?: "text-layer" | "document-ai" | "none";
  ocrText?: string;
  status: DocumentHubStatus;
  documentType: string;
  groupKey: string;
  moduleKey: string;
  classificationSource: "user_confirmed" | "suggestion";
  confidence: number;
  fields: HubFields;
  flags: HubFlag[];
  matches: HubMatch[];
  allocation?: HubAllocation;
  chequeLifecycle?: {
    receipt: string;
    bankDeposit: string;
    clearing: string;
    reconciliation: string;
    bankReference?: string;
  };
  links: Array<{ docType?: string; docId?: string; attachmentId?: string }>;
  assignedUserId?: string;
  ledgerPosting: string;
  ledgerPostingNote?: string;
  postedRecord?: { kind: string; id: string; number: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentHubGroup {
  _id: string;
  key: string;
  name: string;
  parentKey?: string;
  system: boolean;
}

export interface DocumentLearningRule {
  _id: string;
  partyName?: string;
  documentType: string;
  groupKey: string;
  status: "proposed" | "confirmed";
  mode: "suggest" | "draft" | "auto_post";
  ledgerAccountLabel?: string;
}

export interface DocumentHubList {
  items: ScannedDocument[];
  groups: DocumentHubGroup[];
  rules: DocumentLearningRule[];
  counts: Array<{ _id: string; count: number }>;
}
