import { apiRequest, requireLiveApi } from "./client";

export type SalesDocumentFlowMode = "classic" | "pick_pack_first";

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
