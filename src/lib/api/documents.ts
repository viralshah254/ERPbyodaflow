import type { DocTypeKey } from "@/config/documents/types";
import type {
  DocListRow,
  DocumentDetailRecord,
  DocumentStatusActor,
  DocumentTimelineEntry,
} from "@/lib/types/documents";
import { apiRequest, downloadFile, isApiConfigured, requireLiveApi } from "./client";

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
  unit?: string;
  unitPrice?: number;
  tax?: number;
  amount?: number;
  sourceDocumentId?: string;
  sourceDocumentType?: DocTypeKey;
  sourceLineId?: string;
  sourceQuantity?: number;
  convertedQuantity?: number;
  remainingQuantity?: number;
  taxCodeId?: string;
  effectiveTaxCodeId?: string;
  taxCodeCode?: string;
  taxCodeName?: string;
  taxRate?: number;
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
  partyId?: string;
  party?: string;
  branchId?: string;
  warehouseId?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
  statusActor?: DocumentStatusActor | null;
  availableActions?: Array<"submit" | "approve" | "post" | "cancel" | "reverse">;
  availableConversionTargets?: DocTypeKey[];
  outputTemplateId?: string;
  lines?: BackendDocumentLine[];
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
  attachments?: BackendAttachment[];
  comments?: BackendComment[];
  approvalHistory?: BackendTimelineEntry[];
  auditHistory?: BackendTimelineEntry[];
  emailedAt?: string;
  emailedTo?: string;
  notes?: string;
  dueDate?: string;
  paymentStatus?: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  paidAmount?: number;
  openAmount?: number;
  isOverdue?: boolean;
  documentChain?: ChainNode[];
};

type ChainNode = {
  id: string;
  number: string;
  typeKey: string;
  status: string;
  total?: number;
  date?: string;
  children: ChainNode[];
};

type BackendDocumentListItem = {
  id: string;
  number: string;
  date: string;
  party?: string;
  partyId?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  totalWeightKg?: number;
  status: string;
  warehouse?: string;
  warehouseId?: string;
  poRef?: string;
  reference?: string;
  pendingApprovalReason?: string;
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
  sourceDocumentId?: string;
  sourceDocumentType?: DocTypeKey;
  sourceDocumentNumber?: string;
  lines: Array<{
    productId?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    taxCodeId?: string;
    tax?: number;
    amount?: number;
    debit?: number;
    credit?: number;
    sourceLineId?: string;
  }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency?: string;
  /** Document currency → base currency. From exchange rate API or user override. */
  exchangeRate?: number;
  linesAreTaxInclusive?: boolean;
  outputTemplateId?: string;
};

export type PurchaseOrderLookupOption = {
  id: string;
  label: string;
  description?: string;
  status: string;
  partyId?: string;
  date?: string;
  currency?: string;
  total?: number;
};

/** Search purchase orders for pickers. Pass `status` to filter (e.g. "APPROVED" or comma-separated "APPROVED,RECEIVED"). Pass `excludeWithCashDisbursement: true` to hide POs that already have a cash disbursement. */
export async function searchPurchaseOrderLookupApi(
  query: string,
  options?: { status?: string; excludeWithCashDisbursement?: boolean }
): Promise<PurchaseOrderLookupOption[]> {
  if (!isApiConfigured()) return [];
  const params = new URLSearchParams({ limit: "20" });
  if (query.trim()) params.set("search", query.trim());
  if (options?.status) params.set("status", options.status);
  if (options?.excludeWithCashDisbursement) params.set("excludeWithCashDisbursement", "1");
  const payload = await apiRequest<{
    items: Array<{
      id: string;
      number: string;
      label: string;
      status: string;
      partyId?: string;
      date?: string;
      currency?: string;
      total?: number;
      reference?: string;
    }>;
  }>(`/api/documents/purchase-order/lookup?${params.toString()}`);
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    label: item.label || item.number,
    description: [item.date ? new Date(item.date).toLocaleDateString() : null, item.currency]
      .filter(Boolean)
      .join(" · ") || undefined,
    status: item.status,
    partyId: item.partyId,
    date: item.date,
    currency: item.currency,
    total: item.total,
  }));
}

export type DocumentConvertPayload = {
  targetType: DocTypeKey;
  date?: string;
  dueDate?: string;
  branchId?: string;
  partyId?: string;
  warehouseId?: string;
  poRef?: string;
  reference?: string;
  currency?: string;
  outputTemplateId?: string;
  lines?: Array<{ sourceLineId?: string; quantity?: number }>;
};

export type DocumentPostingPreviewLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string;
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
    partyId: payload.partyId,
    party: payload.party,
    branchId: payload.branchId,
    warehouseId: payload.warehouseId,
    total: payload.total,
    currency: payload.currency ?? "KES",
    exchangeRate: payload.exchangeRate,
    status: payload.status,
    statusActor: payload.statusActor ?? null,
    availableActions: payload.availableActions ?? [],
    availableConversionTargets: payload.availableConversionTargets ?? [],
    outputTemplateId: payload.outputTemplateId,
    lines: (payload.lines ?? []).map((line) => ({
      id: line.id,
      description: line.description ?? "Line item",
      productId: line.productId,
      productName: line.productName,
      productSku: line.productSku,
      accountId: line.accountId,
      accountName: line.accountName,
      accountCode: line.accountCode,
      qty: line.qty ?? line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      tax: line.tax,
      amount: line.amount,
      sourceDocumentId: line.sourceDocumentId,
      sourceDocumentType: line.sourceDocumentType,
      sourceLineId: line.sourceLineId,
      sourceQuantity: line.sourceQuantity,
      convertedQuantity: line.convertedQuantity,
      remainingQuantity: line.remainingQuantity,
      taxCodeId: line.taxCodeId,
      effectiveTaxCodeId: line.effectiveTaxCodeId,
      taxCodeCode: line.taxCodeCode,
      taxCodeName: line.taxCodeName,
      taxRate: line.taxRate,
    })),
    sourceDocument: payload.sourceDocument ?? null,
    linkedDeliveries: payload.linkedDeliveries ?? [],
    relatedDocuments: payload.relatedDocuments ?? [],
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
    emailedAt: payload.emailedAt,
    emailedTo: payload.emailedTo,
    notes: payload.notes,
    dueDate: payload.dueDate,
    paymentStatus: payload.paymentStatus,
    paidAmount: payload.paidAmount,
    openAmount: payload.openAmount,
    isOverdue: payload.isOverdue,
    documentChain: payload.documentChain,
  };
}

function mapDocumentListItem(item: BackendDocumentListItem): DocListRow {
  return {
    id: item.id,
    number: item.number,
    date: typeof item.date === "string" ? item.date.slice(0, 10) : item.date,
    party: item.party ?? item.partyId,
    total: item.total,
    currency: item.currency,
    exchangeRate: item.exchangeRate,
    landedAllocated: item.landedAllocated,
    landedBreakdown: item.landedBreakdown,
    economicTotal: item.economicTotal,
    totalWeightKg: item.totalWeightKg,
    status: item.status,
    warehouse: item.warehouse ?? item.warehouseId,
    poRef: item.poRef,
    reference: item.reference,
    pendingApprovalReason: item.pendingApprovalReason,
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
  requireLiveApi("Document detail");
  const payload = await apiRequest<BackendDocumentDetail>(`/api/documents/${type}/${id}`);
  return mapDocumentDetail(type, payload);
}

export async function fetchDocumentListApi(type: DocTypeKey): Promise<DocListRow[]> {
  requireLiveApi("Document list");
  const payload = await apiRequest<BackendDocumentListResponse>(`/api/documents/${type}`);
  return payload.items.map(mapDocumentListItem);
}

export async function bulkDocumentActionApi(
  type: DocTypeKey,
  action: "submit" | "approve" | "post" | "cancel",
  ids: string[]
): Promise<{ results: { id: string; status?: string; error?: string }[] }> {
  if (!ids.length) return { results: [] };
  requireLiveApi("Document actions");
  return apiRequest<{ action: string; results: { id: string; status?: string; error?: string }[] }>(
    `/api/documents/${type}/bulk-action`,
    { method: "POST", body: { action, ids } }
  );
}

export async function createDocumentApi(
  type: DocTypeKey,
  payload: DocumentDraftPayload
): Promise<{ id: string; number?: string; status?: string }> {
  requireLiveApi("Document creation");
  return apiRequest<{ id: string; number?: string; status?: string }>(`/api/documents/${type}`, {
    method: "POST",
    body: payload,
  });
}

export async function previewDocumentPostingApi(
  type: DocTypeKey,
  payload: DocumentDraftPayload
): Promise<DocumentPostingPreviewLine[]> {
  requireLiveApi("Document posting preview");
  const result = await apiRequest<{ items: DocumentPostingPreviewLine[] }>(`/api/documents/${type}/posting-preview`, {
    method: "POST",
    body: payload,
  });
  return result.items ?? [];
}

export async function convertDocumentApi(
  type: DocTypeKey,
  id: string,
  payload: DocumentConvertPayload
): Promise<{ id: string; typeKey?: DocTypeKey; number?: string; status?: string }> {
  requireLiveApi("Document conversion");
  return apiRequest<{ id: string; typeKey?: DocTypeKey; number?: string; status?: string }>(
    `/api/documents/${type}/${id}/convert`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function requestDocumentApprovalApi(
  type: DocTypeKey,
  id: string,
  comment?: string
): Promise<void> {
  requireLiveApi("Document approval request");
  await apiRequest(`/api/documents/${type}/${id}/request-approval`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function documentActionApi(
  type: DocTypeKey,
  id: string,
  action: "approve" | "post" | "cancel" | "reverse",
  comment?: string
): Promise<void> {
  requireLiveApi("Document action");
  await apiRequest(`/api/documents/${type}/${id}/action`, {
    method: "POST",
    body: { action, ...(comment != null ? { comment } : {}) },
  });
}

export function downloadDocumentPdfApi(
  type: DocTypeKey,
  id: string,
  fileName: string,
  onNotAvailable: (message: string) => void
): void {
  requireLiveApi("Document PDF export");
  downloadFile(`/api/documents/${type}/${id}/pdf`, fileName, onNotAvailable);
}

export function exportDocumentListApi(
  type: DocTypeKey,
  fileName: string,
  onNotAvailable: (message: string) => void
): void {
  requireLiveApi("Document list export");
  downloadFile(`/api/documents/${type}/export`, fileName, onNotAvailable);
}

export async function patchDocumentApi(
  type: DocTypeKey,
  id: string,
  payload: Partial<DocumentDraftPayload> & { notes?: string }
): Promise<void> {
  requireLiveApi("Document update");
  await apiRequest(`/api/documents/${type}/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function addDocumentCommentApi(
  type: DocTypeKey,
  id: string,
  body: string
): Promise<void> {
  requireLiveApi("Document comments");
  await apiRequest(`/api/docs/${type}/${id}/comments`, {
    method: "POST",
    body: { text: body },
  });
}

export async function editDocumentCommentApi(
  type: DocTypeKey,
  id: string,
  commentId: string,
  text: string
): Promise<void> {
  requireLiveApi("Edit document comment");
  await apiRequest(`/api/docs/${type}/${id}/comments/${encodeURIComponent(commentId)}`, {
    method: "PATCH",
    body: { text },
  });
}

export async function deleteDocumentCommentApi(
  type: DocTypeKey,
  id: string,
  commentId: string
): Promise<void> {
  requireLiveApi("Delete document comment");
  await apiRequest(`/api/docs/${type}/${id}/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

export async function uploadDocumentAttachmentApi(
  type: DocTypeKey,
  id: string,
  file: File
): Promise<void> {
  requireLiveApi("Document attachments");
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
  requireLiveApi("Document attachment downloads");
  downloadFile(
    `/api/documents/${type}/${id}/attachments/${attachmentId}`,
    fileName,
    onNotAvailable
  );
}
