import type { DocTypeKey } from "@/config/documents/types";
import { getMockDocs, type DocListRow } from "@/lib/mock/docs";
import { createApprovalRequest, replaceApprovalDocumentReference } from "@/lib/data/approvals.repo";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

export interface DocumentAttachmentRecord {
  id: string;
  name: string;
  size?: string;
}

export interface DocumentCommentRecord {
  id: string;
  author: string;
  at: string;
  body: string;
}

export interface DocumentTimelineEntry {
  id: string;
  action: string;
  by: string;
  at: string;
}

export interface DocumentDetailRecord {
  id: string;
  type: DocTypeKey;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency: string;
  status: string;
  lines: Array<{
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
  }>;
  attachments: DocumentAttachmentRecord[];
  comments: DocumentCommentRecord[];
  approvalHistory: DocumentTimelineEntry[];
  auditHistory: DocumentTimelineEntry[];
}

const LIST_KEY_PREFIX = "odaflow_documents_list";
const DETAIL_KEY_PREFIX = "odaflow_documents_detail";

function listKey(type: DocTypeKey): string {
  return `${LIST_KEY_PREFIX}:${type}`;
}

function detailKey(type: DocTypeKey): string {
  return `${DETAIL_KEY_PREFIX}:${type}`;
}

function seedDocumentList(type: DocTypeKey): DocListRow[] {
  return getMockDocs(type).map((row) => ({ ...row }));
}

function buildDefaultLines(type: DocTypeKey, number: string): DocumentDetailRecord["lines"] {
  const linePrefix =
    type === "journal"
      ? "Ledger line"
      : type === "grn"
        ? "Receipt line"
        : type === "purchase-order" || type === "purchase-request" || type === "bill"
          ? "Procurement line"
          : "Commercial line";
  return [
    { description: `${linePrefix} 1 for ${number}`, qty: 1, amount: 10000 },
    { description: `${linePrefix} 2 for ${number}`, qty: 2, amount: 5000 },
  ];
}

function seedDocumentDetails(type: DocTypeKey): Record<string, DocumentDetailRecord> {
  return seedDocumentList(type).reduce<Record<string, DocumentDetailRecord>>((acc, row) => {
    acc[row.id] = {
      id: row.id,
      type,
      number: row.number,
      date: row.date,
      party: row.party,
      total: row.total,
      currency: "KES",
      status: row.status,
      lines: buildDefaultLines(type, row.number),
      attachments: [],
      comments: [],
      approvalHistory: [
        {
          id: `${row.id}-created`,
          action: "Created",
          by: "System",
          at: `${row.date}T08:00:00Z`,
        },
      ],
      auditHistory: [
        {
          id: `${row.id}-audit-created`,
          action: "Document created",
          by: "System",
          at: `${row.date}T08:00:00Z`,
        },
      ],
    };
    return acc;
  }, {});
}

export function listDocuments(type: DocTypeKey): DocListRow[] {
  return loadStoredValue(listKey(type), () => seedDocumentList(type)).map((row) => ({ ...row }));
}

export function getDocumentDetail(type: DocTypeKey, id: string): DocumentDetailRecord | null {
  const detailMap = loadStoredValue(detailKey(type), () => seedDocumentDetails(type));
  const detail = detailMap[id];
  if (!detail) return null;
  return {
    ...detail,
    lines: detail.lines.map((line) => ({ ...line })),
    attachments: detail.attachments.map((item) => ({ ...item })),
    comments: detail.comments.map((item) => ({ ...item })),
    approvalHistory: detail.approvalHistory.map((entry) => ({ ...entry })),
    auditHistory: detail.auditHistory.map((entry) => ({ ...entry })),
  };
}

function saveDetail(type: DocTypeKey, detail: DocumentDetailRecord): void {
  const detailMap = loadStoredValue(detailKey(type), () => seedDocumentDetails(type));
  saveStoredValue(detailKey(type), { ...detailMap, [detail.id]: detail });
}

function syncListRow(type: DocTypeKey, id: string, patch: Partial<DocListRow>): void {
  const rows = listDocuments(type).map((row) => (row.id === id ? { ...row, ...patch } : row));
  saveStoredValue(listKey(type), rows);
}

function appendAudit(
  detail: DocumentDetailRecord,
  action: string,
  by = "Demo User"
): DocumentDetailRecord {
  const at = new Date().toISOString();
  return {
    ...detail,
    auditHistory: [
      {
        id: `${detail.id}-${action}-${Date.now()}`,
        action,
        by,
        at,
      },
      ...detail.auditHistory,
    ],
  };
}

export function addDocumentComment(type: DocTypeKey, id: string, body: string, author = "Demo User"): void {
  const detail = getDocumentDetail(type, id);
  if (!detail) return;
  const next = appendAudit(
    {
      ...detail,
      comments: [
        {
          id: `${id}-comment-${Date.now()}`,
          author,
          at: new Date().toISOString(),
          body,
        },
        ...detail.comments,
      ],
    },
    "Comment added",
    author
  );
  saveDetail(type, next);
}

export function addDocumentAttachment(type: DocTypeKey, id: string, fileName: string): void {
  const detail = getDocumentDetail(type, id);
  if (!detail) return;
  const next = appendAudit(
    {
      ...detail,
      attachments: [
        {
          id: `${id}-attachment-${Date.now()}`,
          name: fileName,
          size: "Demo file",
        },
        ...detail.attachments,
      ],
    },
    "Attachment added"
  );
  saveDetail(type, next);
}

export function requestDocumentApproval(type: DocTypeKey, id: string): void {
  const detail = getDocumentDetail(type, id);
  if (!detail) return;
  const next = appendAudit(
    {
      ...detail,
      status: "PENDING_APPROVAL",
      approvalHistory: [
        {
          id: `${id}-approval-request-${Date.now()}`,
          action: "Approval requested",
          by: "Demo User",
          at: new Date().toISOString(),
        },
        ...detail.approvalHistory,
      ],
    },
    "Approval requested"
  );
  saveDetail(type, next);
  syncListRow(type, id, { status: "PENDING_APPROVAL" });
  createApprovalRequest({
    documentType: type,
    documentId: id,
    documentNumber: detail.number,
    amount: detail.total ?? 0,
    currency: detail.currency,
    requester: "Demo User",
    isMine: true,
  });
}

export function applyDocumentAction(
  type: DocTypeKey,
  id: string,
  action: "approve" | "post"
): void {
  const detail = getDocumentDetail(type, id);
  if (!detail) return;
  const nextStatus =
    action === "approve"
      ? "APPROVED"
      : type === "delivery-note"
        ? "DELIVERED"
        : type === "grn"
          ? "RECEIVED"
          : "POSTED";
  const label = action === "approve" ? "Approved" : "Posted";
  const next = appendAudit(
    {
      ...detail,
      status: nextStatus,
      approvalHistory: [
        {
          id: `${id}-${action}-${Date.now()}`,
          action: label,
          by: "Demo User",
          at: new Date().toISOString(),
        },
        ...detail.approvalHistory,
      ],
    },
    label
  );
  saveDetail(type, next);
  syncListRow(type, id, { status: nextStatus });
  replaceApprovalDocumentReference(type, id, { status: action === "approve" ? "approved" : "approved" });
}

function getLocalDocumentPrefix(type: DocTypeKey): string {
  const prefixes: Record<DocTypeKey, string> = {
    quote: "QT",
    "sales-order": "SO",
    "delivery-note": "DN",
    invoice: "INV",
    "purchase-request": "PR",
    "purchase-order": "PO",
    grn: "GRN",
    bill: "BILL",
    journal: "JE",
  };
  return prefixes[type];
}

export function createDocumentDraft(
  type: DocTypeKey,
  payload: {
    date: string;
    partyId?: string;
    warehouseId?: string;
    poRef?: string;
    reference?: string;
    total: number;
    currency?: string;
    lines: Array<{
      description?: string;
      quantity?: number;
      amount?: number;
    }>;
  }
): DocListRow {
  const now = Date.now();
  const id = `local-${type}-${now}`;
  const number = `${getLocalDocumentPrefix(type)}-${new Date().getFullYear()}-${String(now).slice(-4)}`;
  const row: DocListRow = {
    id,
    number,
    date: payload.date,
    party: payload.partyId,
    total: payload.total,
    status: "DRAFT",
    warehouse: payload.warehouseId,
    poRef: payload.poRef,
    reference: payload.reference,
  };
  saveStoredValue(listKey(type), [row, ...listDocuments(type)]);
  const detailMap = loadStoredValue(detailKey(type), () => seedDocumentDetails(type));
  detailMap[id] = {
    id,
    type,
    number,
    date: payload.date,
    party: payload.partyId,
    total: payload.total,
    currency: payload.currency ?? "KES",
    status: "DRAFT",
    lines: payload.lines.map((line, index) => ({
      description: line.description ?? `Line ${index + 1}`,
      qty: line.quantity,
      amount: line.amount,
    })),
    attachments: [],
    comments: [],
    approvalHistory: [],
    auditHistory: [
      {
        id: `${id}-created`,
        action: "Document created",
        by: "Demo User",
        at: new Date().toISOString(),
      },
    ],
  };
  saveStoredValue(detailKey(type), detailMap);
  return row;
}

