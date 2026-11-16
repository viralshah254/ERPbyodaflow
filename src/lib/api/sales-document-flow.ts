import { apiRequest, requireLiveApi } from "./client";

/** "joy_dispatch" is the legacy saved name of "route_dispatch". */
export type SalesDocumentFlowMode = "classic" | "pick_pack_first" | "route_dispatch" | "joy_dispatch";

export function isRouteDispatchMode(mode: string | null | undefined): boolean {
  return mode === "route_dispatch" || mode === "joy_dispatch";
}

export type SalesDocumentFlowSettings = {
  mode: SalesDocumentFlowMode;
  requireSalesOrderApprovalBeforePicking: boolean;
  requirePickPackCompletionBeforeInvoice: boolean;
  generateInvoiceAndDeliveryNoteTogether: boolean;
  requireSuccessfulKraSigningBeforeDispatch: boolean;
  allowDispatchWhileKraSigningPending: boolean;
  enableQrProofOfDelivery: boolean;
  allowCustomerSignature: boolean;
  allowDeliveryNotePhotoUpload: boolean;
  allowInternalPodUpload: boolean;
  requirePodBeforeOrderComplete: boolean;
  allowPartialDeliveries: boolean;
  allowPartialReceipt: boolean;
  sendPodNotification: boolean;
  prefillSalesOrderFinishedGoods: boolean;
  routeCollectionsEnabled?: boolean;
  /** Route dispatch: the store trucks are loaded from. */
  dispatchWarehouseId?: string;
  productionRecording?: "planned" | "record_output";
  finishedGoodsSalesUnit?: "product_pack" | "pack_size_in_name";
  approveNewFieldCustomers?: boolean;
  vanSalesBook?: boolean;
};

export async function fetchSalesDocumentFlowApi(): Promise<SalesDocumentFlowSettings> {
  requireLiveApi("Sales document flow");
  return apiRequest<SalesDocumentFlowSettings>("/api/settings/sales/document-flow");
}

export async function updateSalesDocumentFlowApi(
  settings: SalesDocumentFlowSettings
): Promise<SalesDocumentFlowSettings> {
  requireLiveApi("Sales document flow");
  return apiRequest<SalesDocumentFlowSettings>("/api/settings/sales/document-flow", {
    method: "PUT",
    body: settings,
  });
}

export async function startPickPackFromSalesOrderApi(salesOrderId: string): Promise<{
  pickPackId: string;
  number: string;
  status: string;
}> {
  requireLiveApi("Pick and pack");
  return apiRequest(`/api/sales/document-flow/sales-orders/${salesOrderId}/pick-pack`, { method: "POST", body: {} });
}

export async function generateInvoiceAndDeliveryNoteApi(
  salesOrderId: string,
  body?: { overridePackedQuantity?: boolean; overrideReason?: string }
): Promise<{
  deliveryNoteId: string;
  deliveryNoteNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  kraStatus: string;
  kraLabel: string;
  kraError?: string;
}> {
  requireLiveApi("Invoice and delivery note");
  return apiRequest(`/api/sales/document-flow/sales-orders/${salesOrderId}/invoice-and-delivery-note`, {
    method: "POST",
    body: body ?? {},
  });
}
