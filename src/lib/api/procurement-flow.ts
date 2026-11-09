import { apiRequest } from "./client";
export type PurchaseReviewLine = {
  lineId: string;
  productId: string;
  approvedQuantity: number;
  orderedQuantity: number;
  unit: string;
  supplierId: string;
  unitPrice: number;
  taxCodeId?: string;
  linesAreTaxInclusive?: boolean;
  currency: string;
  decision: "APPROVED" | "REJECTED" | "PENDING";
  note?: string;
  baseUomSnapshot?: string;
  uomToBaseFactorSnapshot?: number;
};
export type PurchaseReview = {
  revision: number;
  lines: PurchaseReviewLine[];
  batches: Array<{ key: string; orderIds: string[] }>;
};
export type PurchaseReviewPage = {
  request: {
    _id: string;
    number: string;
    status: string;
    currency?: string;
    lines: Array<{
      lineId: string;
      productId?: string;
      description?: string;
      quantity: number;
      unit?: string;
    }>;
  };
  review: PurchaseReview | null;
  taxes: Array<{ id: string; name: string; rate: number }>;
  suppliers: Array<{ id: string; name: string }>;
  products?: Array<{ id: string; name: string }>;
};
export type PurchaseDefault = {
  supplierId?: string;
  supplierName?: string;
  unitPrice?: number;
  currency?: string;
  unit: string;
  taxCodeId?: string;
  linesAreTaxInclusive?: boolean;
  sourceNumber?: string;
  date?: string;
};
export const getPurchaseReview = (id: string) =>
  apiRequest<PurchaseReviewPage>(
    `/api/procurement/requests/${encodeURIComponent(id)}/review`,
  );
export const getPurchaseDefault = (id: string, supplierId?: string) =>
  apiRequest<PurchaseDefault>(
    `/api/procurement/defaults/${encodeURIComponent(id)}`,
    { params: supplierId ? { supplierId } : undefined },
  );
export const savePurchaseReview = (
  id: string,
  revision: number,
  lines: PurchaseReviewLine[],
) =>
  apiRequest<PurchaseReview>(
    `/api/procurement/requests/${encodeURIComponent(id)}/review`,
    { method: "PUT", body: { revision, lines } },
  );
export const createPurchaseOrders = (
  id: string,
  revision: number,
  requestKey: string,
  selections: Array<{ lineId: string; quantity: number }>,
) =>
  apiRequest<{ orderIds: string[] }>(
    `/api/procurement/requests/${encodeURIComponent(id)}/orders`,
    { method: "POST", body: { revision, requestKey, selections } },
  );
export const purchaseOptions = (kind: "product" | "supplier", search: string) =>
  apiRequest<
    Array<{ id: string; label: string; description?: string; unit?: string }>
  >("/api/procurement/options", { params: { kind, search } });
export type CompanyEmail = {
  revision: number;
  mode: "MANAGED" | "OWN_ACCOUNT";
  fromEmail: string;
  fromName: string;
  replyTo: string;
  webhookKey: string;
  verified: boolean;
  enabled: boolean;
  configured: boolean;
  encryptionConfigured: boolean;
  dnsName?: string;
  dnsValue?: string;
};
export type Delivery = {
  _id: string;
  status: string;
  to: string;
  fromEmail: string;
  createdAt: string;
  error?: string;
  providerId?: string;
};
export type PoDeliveryState = {
  sourceHash: string;
  jobs: Delivery[];
  supplier: { name: string; email?: string } | null;
  sender: string | null;
};
export const getPoDeliveries = (id: string) =>
  apiRequest<PoDeliveryState>(
    `/api/procurement/orders/${encodeURIComponent(id)}/deliveries`,
  );
export const sendPo = (
  id: string,
  requestKey: string,
  approve: boolean,
  resendReason?: string,
  reviewed?: { to: string; from: string; sourceHash: string },
) =>
  apiRequest(
    `/api/procurement/orders/${encodeURIComponent(id)}/${approve ? "approve-send" : "send"}`,
    { method: "POST", body: { requestKey, resendReason } },
  );
