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
  /** Line gross weight (kg); used as POD baseline for weight variance. */
  weightKg?: number;
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

type BackendPodConfirmationLine = {
  lineId: string;
  qtyShipped: number;
  qtyReceived: number;
  varianceReason?: string;
  receivedWeightKg?: number;
  varianceEvidenceAttachmentIds?: string[];
};

type BackendPodConfirmation = {
  confirmedAt: string | Date;
  confirmedByUserId?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverSignatureAttachmentId?: string;
  dispatcherName?: string;
  dispatcherSignatureAttachmentId?: string;
  note?: string;
  lines: BackendPodConfirmationLine[];
};

type BackendDispatchPickupLine = {
  lineId: string;
  loadedWeightKg: number;
  varianceReason?: string;
};

type BackendDispatchPickup = {
  dispatchedAt: string | Date;
  dispatchedByUserId?: string;
  dispatcherName: string;
  signatureAttachmentId: string;
  lines: BackendDispatchPickupLine[];
};

type BackendDeliveryCheckIn = {
  checkedInAt: string | Date;
  checkedInByUserId?: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  withinGeofence: boolean;
  geofenceRadiusM: number;
};

type BackendWarehouseDrop = {
  droppedAt: string | Date;
  droppedByUserId?: string;
  dispatcherName: string;
  signatureAttachmentId: string;
  warehouseId: string;
  note?: string;
  lines: Array<{ lineId: string; droppedWeightKg: number; varianceReason?: string }>;
  draftGrnId?: string;
  receivedAt?: string | Date;
  receivedByUserId?: string;
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
  podConfirmation?: BackendPodConfirmation;
  dispatchPickup?: BackendDispatchPickup;
  deliveryCheckIn?: BackendDeliveryCheckIn;
  warehouseDrop?: BackendWarehouseDrop;
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
  warehouse?: string;
  warehouseId?: string;
  poRef?: string;
  reference?: string;
  pendingApprovalReason?: string;
};

type BackendDocumentListResponse = {
  items: BackendDocumentListItem[];
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
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
  const lineTotal = (payload.lines ?? []).reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const resolvedTotal =
    (typeof payload.total === "number" && payload.total > 0)
      ? payload.total
      : lineTotal > 0
        ? lineTotal
        : payload.total ?? 0;
  return {
    id: payload.id,
    type,
    number: payload.number,
    date: payload.date,
    partyId: payload.partyId,
    party: payload.party,
    branchId: payload.branchId,
    warehouseId: payload.warehouseId,
    total: resolvedTotal,
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
      ...(typeof line.weightKg === "number" ? { weightKg: line.weightKg } : {}),
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
    podConfirmation: payload.podConfirmation
      ? {
          confirmedAt:
            typeof payload.podConfirmation.confirmedAt === "string"
              ? payload.podConfirmation.confirmedAt
              : new Date(payload.podConfirmation.confirmedAt).toISOString(),
          confirmedByUserId: payload.podConfirmation.confirmedByUserId,
          receiverName: payload.podConfirmation.receiverName,
          receiverPhone: payload.podConfirmation.receiverPhone,
          receiverSignatureAttachmentId: payload.podConfirmation.receiverSignatureAttachmentId,
          dispatcherName: payload.podConfirmation.dispatcherName,
          dispatcherSignatureAttachmentId: payload.podConfirmation.dispatcherSignatureAttachmentId,
          note: payload.podConfirmation.note,
          lines: (payload.podConfirmation.lines ?? []).map((ln) => ({
            lineId: ln.lineId,
            qtyShipped: ln.qtyShipped,
            qtyReceived: ln.qtyReceived,
            ...(ln.varianceReason ? { varianceReason: ln.varianceReason } : {}),
            ...(typeof ln.receivedWeightKg === "number" ? { receivedWeightKg: ln.receivedWeightKg } : {}),
            ...(ln.varianceEvidenceAttachmentIds?.length
              ? { varianceEvidenceAttachmentIds: ln.varianceEvidenceAttachmentIds }
              : {}),
          })),
        }
      : undefined,
    dispatchPickup: payload.dispatchPickup
      ? {
          dispatchedAt:
            typeof payload.dispatchPickup.dispatchedAt === "string"
              ? payload.dispatchPickup.dispatchedAt
              : new Date(payload.dispatchPickup.dispatchedAt).toISOString(),
          dispatchedByUserId: payload.dispatchPickup.dispatchedByUserId,
          dispatcherName: payload.dispatchPickup.dispatcherName,
          signatureAttachmentId: payload.dispatchPickup.signatureAttachmentId,
          lines: (payload.dispatchPickup.lines ?? []).map((ln) => ({
            lineId: ln.lineId,
            loadedWeightKg: ln.loadedWeightKg,
            ...(ln.varianceReason ? { varianceReason: ln.varianceReason } : {}),
          })),
        }
      : undefined,
    deliveryCheckIn: payload.deliveryCheckIn
      ? {
          checkedInAt:
            typeof payload.deliveryCheckIn.checkedInAt === "string"
              ? payload.deliveryCheckIn.checkedInAt
              : new Date(payload.deliveryCheckIn.checkedInAt).toISOString(),
          checkedInByUserId: payload.deliveryCheckIn.checkedInByUserId,
          latitude: payload.deliveryCheckIn.latitude,
          longitude: payload.deliveryCheckIn.longitude,
          distanceM: payload.deliveryCheckIn.distanceM,
          withinGeofence: payload.deliveryCheckIn.withinGeofence,
          geofenceRadiusM: payload.deliveryCheckIn.geofenceRadiusM,
        }
      : undefined,
    warehouseDrop: payload.warehouseDrop
      ? {
          droppedAt:
            typeof payload.warehouseDrop.droppedAt === "string"
              ? payload.warehouseDrop.droppedAt
              : new Date(payload.warehouseDrop.droppedAt).toISOString(),
          droppedByUserId: payload.warehouseDrop.droppedByUserId,
          dispatcherName: payload.warehouseDrop.dispatcherName,
          signatureAttachmentId: payload.warehouseDrop.signatureAttachmentId,
          warehouseId: payload.warehouseDrop.warehouseId,
          note: payload.warehouseDrop.note,
          lines: payload.warehouseDrop.lines ?? [],
          draftGrnId: payload.warehouseDrop.draftGrnId,
          receivedAt: payload.warehouseDrop.receivedAt
            ? typeof payload.warehouseDrop.receivedAt === "string"
              ? payload.warehouseDrop.receivedAt
              : new Date(payload.warehouseDrop.receivedAt).toISOString()
            : undefined,
          receivedByUserId: payload.warehouseDrop.receivedByUserId,
        }
      : undefined,
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
    isLandedCostBill: item.isLandedCostBill,
    costNumber: item.costNumber,
    costType: item.costType,
    costReference: item.costReference,
    sourceGrnId: item.sourceGrnId,
    sourceGrnNumber: item.sourceGrnNumber,
    allocationId: item.allocationId,
    lineIndex: item.lineIndex,
    costAttachments: item.costAttachments,
    linkedBillId: item.linkedBillId,
    linkedBillNumber: item.linkedBillNumber,
    linkedShipmentCosts: item.linkedShipmentCosts,
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

/** Detail include groups — `core` skips attachments, comments, and audit for faster first paint. */
export type DocumentDetailInclude = "core" | "attachments" | "comments" | "audit" | "all";

export async function fetchDocumentDetailApi(
  type: DocTypeKey,
  id: string,
  opts?: { include?: DocumentDetailInclude[] }
): Promise<DocumentDetailRecord | null> {
  requireLiveApi("Document detail");
  const params = new URLSearchParams();
  if (opts?.include?.length) {
    params.set("include", opts.include.join(","));
  }
  const payload = await apiRequest<BackendDocumentDetail>(`/api/documents/${type}/${id}`, {
    params: params.toString() ? params : undefined,
  });
  return mapDocumentDetail(type, payload);
}

export type FetchDocumentListOpts = {
  limit?: number;
  offset?: number;
  /** Server offset alias (same as parties / products). */
  cursor?: string;
  status?: string;
  search?: string;
  branchId?: string;
  partyId?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type FetchDocumentListPageResult = {
  items: DocListRow[];
  total?: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

/** Default cap when aggregating pages for legacy callers (prevents unbounded downloads). */
export const FETCH_DOCUMENT_LIST_AGGREGATE_CAP = 2000;

export async function fetchDocumentListPageApi(
  type: DocTypeKey,
  opts?: FetchDocumentListOpts
): Promise<FetchDocumentListPageResult> {
  requireLiveApi("Document list");
  const params = new URLSearchParams();
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 50;
  params.set("limit", String(lim));
  if (opts?.cursor != null && opts.cursor !== "") {
    params.set("cursor", opts.cursor);
  } else if (opts?.offset != null && opts.offset > 0) {
    params.set("offset", String(opts.offset));
  }
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  if (opts?.branchId?.trim()) params.set("branchId", opts.branchId.trim());
  if (opts?.partyId?.trim()) params.set("partyId", opts.partyId.trim());
  if (opts?.warehouseId?.trim()) params.set("warehouseId", opts.warehouseId.trim());
  if (opts?.dateFrom?.trim()) params.set("dateFrom", opts.dateFrom.trim());
  if (opts?.dateTo?.trim()) params.set("dateTo", opts.dateTo.trim());

  const payload = await apiRequest<BackendDocumentListResponse>(`/api/documents/${encodeURIComponent(type)}`, {
    params,
  });
  const limit = typeof payload.limit === "number" ? payload.limit : lim;
  const parsedOffset =
    typeof payload.offset === "number"
      ? payload.offset
      : opts?.cursor != null && opts.cursor !== ""
        ? Number(opts.cursor) || 0
        : opts?.offset != null && opts.offset > 0
          ? opts.offset
          : 0;
  const items = (payload.items ?? []).map(mapDocumentListItem);
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : items.length === limit && limit > 0;
  let nextCursor: string | null;
  if (payload.nextCursor !== undefined && payload.nextCursor !== null && String(payload.nextCursor) !== "") {
    nextCursor = String(payload.nextCursor);
  } else if (hasMore) {
    nextCursor = String(parsedOffset + items.length);
  } else {
    nextCursor = null;
  }
  return {
    items,
    limit,
    offset: parsedOffset,
    hasMore,
    nextCursor,
  };
}

export async function fetchDocumentListApi(
  type: DocTypeKey,
  opts?: Omit<FetchDocumentListOpts, "offset" | "cursor">
): Promise<DocListRow[]> {
  requireLiveApi("Document list");
  const rows: DocListRow[] = [];
  let cursor: string | undefined;
  while (rows.length < FETCH_DOCUMENT_LIST_AGGREGATE_CAP) {
    const page = await fetchDocumentListPageApi(type, { ...opts, limit: 100, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
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

export type DocumentWriteResponse = {
  id: string;
  number?: string;
  status?: string;
  date?: string;
  total?: number;
  typeKey?: DocTypeKey;
  sourceDocumentId?: string;
  pickPackSyncWarning?: string;
};

export async function createDocumentApi(
  type: DocTypeKey,
  payload: DocumentDraftPayload
): Promise<DocumentWriteResponse> {
  requireLiveApi("Document creation");
  return apiRequest<DocumentWriteResponse>(`/api/documents/${type}`, {
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
): Promise<DocumentWriteResponse> {
  requireLiveApi("Document conversion");
  return apiRequest<DocumentWriteResponse>(`/api/documents/${type}/${id}/convert`, {
    method: "POST",
    body: payload,
  });
}

export async function confirmDeliveryPodApi(
  deliveryNoteId: string,
  payload: {
    receiverName?: string;
    receiverPhone?: string;
    receiverSignatureAttachmentId?: string;
    note?: string;
    lines: Array<{
      lineId: string;
      qtyReceived: number;
      varianceReason?: string;
      receivedWeightKg?: number;
      varianceEvidenceAttachmentIds?: string[];
    }>;
  }
): Promise<void> {
  requireLiveApi("Proof of delivery");
  const receiverName = payload.receiverName?.trim();
  const receiverPhone = payload.receiverPhone?.trim();
  const sigId = payload.receiverSignatureAttachmentId?.trim();
  await apiRequest(`/api/documents/delivery-note/${deliveryNoteId}/pod`, {
    method: "POST",
    body: {
      ...(receiverName ? { receiverName } : {}),
      ...(receiverPhone ? { receiverPhone } : {}),
      ...(sigId ? { receiverSignatureAttachmentId: sigId } : {}),
      ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
      lines: payload.lines,
    },
  });
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
): Promise<DocumentWriteResponse> {
  requireLiveApi("Document update");
  return apiRequest<DocumentWriteResponse>(`/api/documents/${type}/${id}`, {
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
): Promise<{ id: string }> {
  requireLiveApi("Document attachments");
  const content = await fileToBase64(file);
  const payload = await apiRequest<{ id: string; fileName?: string; contentType?: string }>(
    `/api/documents/${type}/${id}/attachments`,
    {
      method: "POST",
      body: {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        content,
      },
    }
  );
  if (!payload?.id) throw new Error("Attachment upload did not return an id.");
  return { id: payload.id };
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
