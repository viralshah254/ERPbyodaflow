import type { DocTypeKey } from "@/config/documents/types";
import {
  addDocumentAttachment,
  addDocumentComment,
  applyDocumentAction,
  createDocumentDraft,
  getDocumentDetail,
  listDocuments,
  requestDocumentApproval,
  type DocumentDetailRecord,
  type DocumentTimelineEntry,
} from "@/lib/data/documents.repo";
import type { DocListRow } from "@/lib/mock/docs";
import { apiRequest, downloadFile, isApiConfigured } from "./client";

type BackendDocumentLine = {
  id?: string;
  description?: string;
  productId?: string;
  productName?: string;
  productSku?: string;
  accountId?: string;
  accountName?: string;
  accountCode?: string;
  qty?: number;
  quantity?: number;
  tax?: number;
  amount?: number;
};

type BackendAttachment = {
  id: string;
  name: string;
  size?: string;
};

type BackendComment = {
  id: string;
  author?: string;
  at: string;
  body: string;
};

type BackendTimelineEntry = {
  id: string;
  action: string;
  by: string;
  at: string;
  note?: string;
};

type BackendDocumentDetail = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  status: string;
  lines?: BackendDocumentLine[];
  attachments?: BackendAttachment[];
  comments?: BackendComment[];
  approvalHistory?: BackendTimelineEntry[];
  auditHistory?: BackendTimelineEntry[];
};

type BackendDocumentListItem = {
  id: string;
  number: string;
  date: string;
  party?: string;
  partyId?: string;
  total?: number;
  status: string;
  warehouse?: string;
  warehouseId?: string;
  poRef?: string;
  reference?: string;
};

type BackendDocumentListResponse = {
  items: BackendDocumentListItem[];
};

export type DocumentDraftPayload = {
  date: string;
  branchId?: string;
  partyId?: string;
  warehouseId?: string;
  poRef?: string;
  reference?: string;
  dueDate?: string;
  lines: Array<{
    productId?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    amount?: number;
    debit?: number;
    credit?: number;
  }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency?: string;
};

function mapTimeline(entries?: BackendTimelineEntry[]): DocumentTimelineEntry[] {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    action: entry.action,
    by: entry.by,
    at: new Date(entry.at).toLocaleString(),
  }));
}

function mapDocumentDetail(
  type: DocTypeKey,
  payload: BackendDocumentDetail
): DocumentDetailRecord {
  return {
    id: payload.id,
    type,
    number: payload.number,
    date: payload.date,
    party: payload.party,
    total: payload.total,
    currency: payload.currency ?? "KES",
    status: payload.status,
    lines: (payload.lines ?? []).map((line) => ({
      description: line.description ?? "Line item",
        productId: line.productId,
        productName: line.productName,
        productSku: line.productSku,
        accountId: line.accountId,
        accountName: line.accountName,
        accountCode: line.accountCode,
      qty: line.qty ?? line.quantity,
        tax: line.tax,
      amount: line.amount,
    })),
    attachments: (payload.attachments ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
    })),
    comments: (payload.comments ?? []).map((item) => ({
      id: item.id,
      author: item.author ?? "Unknown user",
      at: item.at,
      body: item.body,
    })),
    approvalHistory: mapTimeline(payload.approvalHistory),
    auditHistory: mapTimeline(payload.auditHistory),
  };
}

function mapDocumentListItem(item: BackendDocumentListItem): DocListRow {
  return {
    id: item.id,
    number: item.number,
    date: item.date,
    party: item.party ?? item.partyId,
    total: item.total,
    status: item.status,
    warehouse: item.warehouse ?? item.warehouseId,
    poRef: item.poRef,
    reference: item.reference,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read attachment."));
        return;
      }
      const [, base64 = ""] = result.split(",", 2);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read attachment."));
    reader.readAsDataURL(file);
  });
}

export async function fetchDocumentDetailApi(
  type: DocTypeKey,
  id: string
): Promise<DocumentDetailRecord | null> {
  if (!isApiConfigured()) {
    return getDocumentDetail(type, id);
  }
  const payload = await apiRequest<BackendDocumentDetail>(`/api/documents/${type}/${id}`);
  return mapDocumentDetail(type, payload);
}

export async function fetchDocumentListApi(type: DocTypeKey): Promise<DocListRow[]> {
  if (!isApiConfigured()) {
    return listDocuments(type);
  }
  const payload = await apiRequest<BackendDocumentListResponse>(`/api/documents/${type}`);
  return payload.items.map(mapDocumentListItem);
}

export async function bulkDocumentActionApi(
  type: DocTypeKey,
  action: "submit" | "approve" | "post" | "cancel",
  ids: string[]
): Promise<void> {
  if (!ids.length) return;
  if (!isApiConfigured()) {
    ids.forEach((id) => {
      if (action === "submit") {
        requestDocumentApproval(type, id);
        return;
      }
      if (action === "approve" || action === "post") {
        applyDocumentAction(type, id, action);
      }
    });
    return;
  }
  await apiRequest(`/api/documents/${type}/bulk-action`, {
    method: "POST",
    body: { action, ids },
  });
}

export async function createDocumentApi(
  type: DocTypeKey,
  payload: DocumentDraftPayload
): Promise<{ id: string; number?: string; status?: string }> {
  if (!isApiConfigured()) {
    const created = createDocumentDraft(type, payload);
    return { id: created.id, number: created.number, status: created.status };
  }
  return apiRequest<{ id: string; number?: string; status?: string }>(`/api/documents/${type}`, {
    method: "POST",
    body: payload,
  });
}

export function exportDocumentListApi(
  type: DocTypeKey,
  fileName: string,
  onNotAvailable: (message: string) => void
): void {
  if (!isApiConfigured()) {
    onNotAvailable("API not configured.");
    return;
  }
  downloadFile(`/api/documents/${type}/export`, fileName, onNotAvailable);
}

export async function addDocumentCommentApi(
  type: DocTypeKey,
  id: string,
  body: string
): Promise<void> {
  if (!isApiConfigured()) {
    addDocumentComment(type, id, body);
    return;
  }
  await apiRequest(`/api/documents/${type}/${id}/comments`, {
    method: "POST",
    body: { text: body },
  });
}

export async function uploadDocumentAttachmentApi(
  type: DocTypeKey,
  id: string,
  file: File
): Promise<void> {
  if (!isApiConfigured()) {
    addDocumentAttachment(type, id, file.name);
    return;
  }
  const content = await fileToBase64(file);
  await apiRequest(`/api/documents/${type}/${id}/attachments`, {
    method: "POST",
    body: {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      content,
    },
  });
}

export function downloadDocumentAttachmentApi(
  type: DocTypeKey,
  id: string,
  attachmentId: string,
  fileName: string,
  onNotAvailable: (message: string) => void
): void {
  if (!isApiConfigured()) {
    onNotAvailable("Attachment downloads require the backend.");
    return;
  }
  downloadFile(
    `/api/documents/${type}/${id}/attachments/${attachmentId}`,
    fileName,
    onNotAvailable
  );
}
