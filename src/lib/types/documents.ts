import type { DocTypeKey } from "@/config/documents/types";

export type DocListRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  status: string;
  poRef?: string;
  warehouse?: string;
  reference?: string;
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
  warehouseId?: string;
  total?: number;
  currency: string;
  status: string;
  availableActions?: Array<"submit" | "approve" | "post" | "cancel" | "reverse">;
  availableConversionTargets?: DocTypeKey[];
  outputTemplateId?: string;
  lines: Array<{
    id?: string;
    description: string;
    qty?: number;
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
};
