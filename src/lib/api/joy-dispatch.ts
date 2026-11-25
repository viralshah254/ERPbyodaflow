import { apiRequest, fetchApiBinary, requireLiveApi } from "./client";

export type JoySalesOrder = {
  id: string;
  number: string;
  date?: string;
  partyId?: string;
  total?: number;
  lineCount?: number;
};

export type JoyPickLine = {
  productId: string;
  name: string;
  sku?: string;
  unit?: string;
  orderedQty: number;
  pickedQty: number;
  allocations?: Array<{ salesOrderId: string; salesOrderNumber?: string; orderedQty: number; pickedQty: number }>;
};

export type JoyPickList = {
  id: string;
  number?: string;
  date: string;
  routeName: string;
  vehicleNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: "DRAFT" | "TRANSFERRED";
  lines: JoyPickLine[];
  dispatchNoteId?: string;
  transferId?: string;
  emailedTo?: string;
};

export const ROUTE_WHERE_NOW = [
  "Still on the vehicle",
  "Back in the route warehouse",
  "Returned to dispatch",
  "Damaged",
] as const;

export type JoyTallyLine = {
  productId: string;
  name: string;
  picked: number;
  invoiceQty: number;
  deliveryQty: number;
  shortQty: number;
  gap: number;
};

export async function fetchJoySalesOrders(): Promise<JoySalesOrder[]> {
  requireLiveApi("Route pick lists");
  const payload = await apiRequest<{ items: JoySalesOrder[] }>("/api/joy-dispatch/sales-orders");
  return payload.items ?? [];
}

export async function fetchJoyPickLists(): Promise<JoyPickList[]> {
  requireLiveApi("Route pick lists");
  const payload = await apiRequest<{ items: JoyPickList[] }>("/api/joy-dispatch/pick-lists");
  return payload.items ?? [];
}

export async function createJoyPickList(input: {
  salesOrderIds: string[];
  date: string;
  routeName: string;
  vehicleNumber: string;
  toWarehouseId: string;
  fromWarehouseId?: string;
}): Promise<JoyPickList> {
  requireLiveApi("Route pick lists");
  return apiRequest("/api/joy-dispatch/pick-lists", { method: "POST", body: input });
}

export async function saveJoyPickedQuantities(
  id: string,
  lines: Array<{ productId: string; pickedQty: number }>
): Promise<JoyPickList> {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { lines },
  });
}

export async function verifyJoyPickList(id: string): Promise<{ dispatchNote?: { id: string; number?: string } }> {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/verify`, { method: "POST", body: {} });
}

export async function recordJoyShort(id: string, input: { productId: string; quantity: number; whereNow: string; requestId: string }) {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/short`, { method: "POST", body: input });
}

export async function recordJoyDamage(
  id: string,
  input: { lines: Array<{ productId: string; quantity: number }>; toWarehouseId?: string; reason?: string; requestId: string }
) {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/damage`, { method: "POST", body: input });
}

export async function emailJoyDispatchNote(id: string, to: string) {
  requireLiveApi("Route pick lists");
  return apiRequest<{ sent: boolean }>(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/email`, {
    method: "POST",
    body: { to },
  });
}

export async function fetchJoyPickListTally(id: string): Promise<{ lines: JoyTallyLine[] }> {
  requireLiveApi("Route pick lists");
  return apiRequest(`/api/joy-dispatch/pick-lists/${encodeURIComponent(id)}/tally`);
}

export type JoyMovement = {
  productId?: string;
  quantity?: number;
  type?: string;
  reference?: string;
  documentType?: string;
  otherSide?: string;
};

export type JoyMovementSummary = {
  warehouseId: string;
  from: string;
  to: string;
  inbound: JoyMovement[];
  outbound: JoyMovement[];
  onHand: number;
  reason: string;
};

export type JoyRouteOrderLine = { lineId: string; productId: string; name: string; unit?: string; quantity: number };
export type JoyRouteOrder = {
  id: string;
  number: string;
  customerName: string;
  branchName: string;
  orderedAt?: string;
  lines: JoyRouteOrderLine[];
};
/** `availableQty` and `shortQty` are set only when the pick store cannot cover the orders yet. */
export type JoyRouteProduct = {
  productId: string; sku?: string; name: string; unit?: string; orderedQty: number; availableQty?: number; shortQty?: number;
};
export type JoyWaitingRoute = {
  warehouseId: string;
  warehouseName: string;
  /** Store these orders are picked from: chosen on the order, else the dispatch store. */
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  orderCount: number;
  orders: JoyRouteOrder[];
  /** Reps already on these orders. The loader note starts with them. */
  salesReps?: LoadSalesRep[];
  products: JoyRouteProduct[];
};

export type LoadSalesRep = { id: string; name: string; phone?: string };

export type JoyLoadNoteStatus = "OPEN" | "AWAITING_FINANCE" | "CONFIRMED" | "INVOICING" | "INVOICED" | "CANCELLED";
/** "both" sends the invoice with the delivery note. "delivery_note" leaves the invoice on standby. */
export type JoyLoadDocumentPlan = "both" | "delivery_note";
export type JoyLoadStockLine = { productId: string; neededQty: number; availableQty: number; shortQty: number };
export type JoyLoadAllocation = {
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  branchName?: string;
  lineId: string;
  orderedQty: number;
  invoiceQty: number;
};
export type JoyLoadNote = {
  id: string;
  number: string;
  date: string;
  createdAt?: string;
  status: JoyLoadNoteStatus;
  truck: string;
  salesReps?: LoadSalesRep[];
  routeWarehouseId: string;
  routeWarehouseName: string;
  fulfilmentWarehouseName: string;
  fulfilmentWarehouseId?: string;
  /** The orders chose the pick store, so it is not the dispatch store. */
  fulfilmentFromOrder?: boolean;
  salesOrderIds: string[];
  lines: Array<{
    productId: string;
    sku?: string;
    name: string;
    unit?: string;
    orderedQty: number;
    loadedQty?: number;
    allocations: JoyLoadAllocation[];
  }>;
  results: Array<{
    salesOrderId: string;
    invoiceId?: string;
    invoiceNumber?: string;
    deliveryNoteId?: string;
    deliveryNoteNumber?: string;
    creditNoteId?: string;
    creditNoteNumber?: string;
    stockIssued?: boolean;
  }>;
  documentPlan?: JoyLoadDocumentPlan;
  mappingIssues?: Array<{
    productId: string;
    productSku?: string;
    productName?: string;
    description?: string;
    unit: string;
    orders: Array<{ id: string; number: string }>;
  }>;
  valuationIssues?: Array<{ productId: string; name: string; sku?: string }>;
  /** Pick-store stock against what the note still needs. Set until the stock is issued. */
  stock?: JoyLoadStockLine[];
  lastError?: string;
  loadedAt?: string;
  invoicedAt?: string;
  departedAt?: string;
};
export type JoyLoadNotes = {
  trucks: string[];
  busyTrucks: string[];
  dispatchWarehouseName: string;
  dispatchWarehouseId?: string;
  /** Active stores a route load can be picked from. */
  stores?: Array<{ id: string; name: string }>;
  waiting: JoyWaitingRoute[];
  notes: JoyLoadNote[];
};

const LOADS = "Loading notes";

export async function fetchJoyLoadNotes(): Promise<JoyLoadNotes> {
  requireLiveApi(LOADS);
  return apiRequest("/api/joy-dispatch/load-notes");
}

export type JoyHandoffLoadNote = {
  id: string;
  number: string;
  status: JoyLoadNoteStatus;
  routeWarehouseId: string;
  /** Documents exist and the truck has not been marked as left. */
  awaitingDeparture?: boolean;
};

export async function fetchJoyLoadNoteForOrder(
  salesOrderId: string
): Promise<{ note: JoyHandoffLoadNote | null }> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/by-order/${encodeURIComponent(salesOrderId)}`);
}

export async function fetchJoyLoadNoteForDeliveryNote(
  deliveryNoteId: string
): Promise<{ note: JoyHandoffLoadNote | null }> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/by-delivery-note/${encodeURIComponent(deliveryNoteId)}`);
}

export async function createJoyLoadNote(input: {
  warehouseId: string; truck: string; sourceWarehouseId?: string; salesRepIds?: string[];
}): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest("/api/joy-dispatch/load-notes", { method: "POST", body: input });
}

/** Blank `toWarehouseId` moves the orders back to the dispatch store. */
export async function setJoyRouteSourceStore(input: {
  warehouseId: string; sourceWarehouseId?: string; toWarehouseId: string;
}): Promise<{ moved: number }> {
  requireLiveApi(LOADS);
  return apiRequest("/api/joy-dispatch/waiting-routes/source-store", { method: "PUT", body: input });
}

export async function setJoyLoadSalesReps(id: string, salesRepIds: string[]): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/sales-reps`, { method: "PUT", body: { salesRepIds } });
}

export async function recordJoyLoaded(
  id: string,
  lines: Array<{ productId: string; loadedQty: number }>,
  documents: JoyLoadDocumentPlan = "both"
): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/loaded`, { method: "POST", body: { lines, documents } });
}

export async function allocateJoyLoad(
  id: string,
  allocations: Array<{ salesOrderId: string; lineId: string; quantity: number }>,
  documents: JoyLoadDocumentPlan = "both"
): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/allocate`, { method: "POST", body: { allocations, documents } });
}

export async function createJoyDeliveryNotes(id: string, salesOrderId?: string): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/delivery-notes`, {
    method: "POST",
    body: salesOrderId ? { salesOrderId } : {},
  });
}

export async function generateJoyInvoices(id: string, salesOrderId?: string): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/invoices`, {
    method: "POST",
    body: salesOrderId ? { salesOrderId } : {},
  });
}

/** Invoices for the confirmed load, with delivery notes unless the route sends invoices only. */
export async function createJoyRouteDocuments(
  id: string,
  opts: { deliveryNotes: boolean; salesOrderId?: string }
): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/documents`, {
    method: "POST",
    body: { deliveryNotes: opts.deliveryNotes, ...(opts.salesOrderId ? { salesOrderId: opts.salesOrderId } : {}) },
  });
}

export async function cancelJoyLoadNote(id: string): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/cancel`, { method: "POST", body: {} });
}

export async function markJoyLoadDeparted(id: string): Promise<JoyLoadNote> {
  requireLiveApi(LOADS);
  return apiRequest(`/api/joy-dispatch/load-notes/${encodeURIComponent(id)}/depart`, { method: "POST", body: {} });
}

/** Opens the browser print dialog for the loader note. The window must be opened before the PDF fetch so the click still counts as the user gesture. */
async function printPdfInNewTab(path: string, title: string, what: string, onError: (message: string) => void) {
  requireLiveApi(LOADS);
  const popup = window.open("", "_blank");
  if (!popup) {
    onError(`Allow pop-ups to print the ${what}.`);
    return;
  }
  popup.document.title = title;
  popup.document.body.textContent = `Preparing the ${what}…`;
  try {
    const blob = await fetchApiBinary(path);
    if (!blob || blob.size === 0) {
      popup.close();
      onError(`Could not load the ${what} for printing.`);
      return;
    }
    const typed = blob.type.includes("pdf") ? blob : new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(typed);
    const safeTitle = title.replace(/[&<>"']/g, "");
    popup.document.open();
    popup.document.write(
      `<!doctype html><html><head><title>${safeTitle}</title><style>html,body{margin:0;height:100%}embed{width:100%;height:100%;border:0}</style></head><body><embed type="application/pdf" src="${url}"></body></html>`
    );
    popup.document.close();
    const print = () => {
      try {
        popup.focus();
        popup.print();
      } catch {
        /* The PDF view still has its own print control. */
      }
    };
    popup.addEventListener("load", () => window.setTimeout(print, 300));
    window.setTimeout(print, 700);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    popup.close();
    onError(error instanceof Error ? error.message : `Could not print the ${what}.`);
  }
}

export function printJoyLoadNotePdf(note: { id: string; number: string }, onError: (message: string) => void) {
  return printPdfInNewTab(`/api/joy-dispatch/load-notes/${encodeURIComponent(note.id)}/pdf`, note.number, "loader note", onError);
}

/** What the route store still has to receive, for whoever does the transfer. */
export function printJoyTransferRequestPdf(note: { id: string; number: string }, onError: (message: string) => void) {
  return printPdfInNewTab(
    `/api/joy-dispatch/load-notes/${encodeURIComponent(note.id)}/transfer-request/pdf`,
    `Transfer request ${note.number}`,
    "transfer request",
    onError
  );
}

export async function emailJoyTransferRequest(noteId: string, to: string) {
  requireLiveApi(LOADS);
  return apiRequest<{ sent: boolean; to: string }>(`/api/joy-dispatch/load-notes/${encodeURIComponent(noteId)}/transfer-request/email`, {
    method: "POST",
    body: { to },
  });
}

export async function fetchJoyMovementSummary(warehouseId: string, from: string, to: string) {
  requireLiveApi("Warehouse movement summary");
  const params = new URLSearchParams({ warehouseId, from, to });
  return apiRequest<JoyMovementSummary>(`/api/joy-dispatch/movement-summary?${params.toString()}`);
}

export async function reviewJoyMovementSummary(input: {
  warehouseId: string;
  from: string;
  to: string;
  reason?: string;
}) {
  requireLiveApi("Warehouse movement summary");
  return apiRequest("/api/joy-dispatch/movement-summary/review", { method: "POST", body: input });
}
