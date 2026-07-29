/**
 * API client for Odaflow → ERP integration admin endpoints.
 */
import { apiRequest, getApiBase, requireLiveApi } from "./client";

export type OdaflowIntegrationApiResponse = {
  orgId: string;
  mappingProfileId: string;
  isActive: boolean;
  allowedManufacturerId: string;
  apiKeyConfigured: boolean;
  hmacSecretConfigured: boolean;
  lastSyncAt: string | null;
  totalEventsProcessed: number;
  recentFailureCount: number;
  enabledEvents: string[];
  inboundBaseUrl: string | null;
  ordersUrl: string | null;
  customersUrl: string | null;
  productsUrl: string | null;
  queueSummary: {
    pending: number;
    processing: number;
    resolved: number;
    failed: number;
    ignored: number;
  };
};

export type OdaflowCredentialsApiResponse = {
  apiKey: string;
  hmacSecret: string;
  orgId: string;
  mappingProfileId: string;
  allowedManufacturerId: string;
  copyNotice: string;
  settings: OdaflowIntegrationApiResponse;
};

export interface OdaflowSyncStatus {
  isActive: boolean;
  lastSyncAt?: string;
  totalEventsProcessed: number;
  recentFailureCount: number;
  enabledEvents: string[];
  queueSummary: {
    pending: number;
    processing: number;
    resolved: number;
    failed: number;
    ignored: number;
  };
}

export interface OdaflowQueueItem {
  _id: string;
  eventType: string;
  odaflowId: string;
  displayRef?: string;
  status: string;
  blockReason?: string;
  unresolvedMappings?: Array<{
    type: string;
    odaflowId: string;
    displayName?: string;
  }>;
  erpDocumentId?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
  rawPayload?: Record<string, unknown>;
}

export interface OdaflowQueueOrderLinePreview {
  index: number;
  odaflowProductId?: string;
  productName?: string;
  barcode?: string;
  packSize?: string;
  qty: number;
  unitPrice?: number;
  subTotal?: number;
  needsProductMatch: boolean;
  erpProductId?: string;
  erpProductName?: string;
}

export interface OdaflowQueueOrderPreview {
  odaflowOrderId: string;
  purchaseOrderNumber?: string;
  channel?: string;
  orderTitle?: string;
  customerName?: string;
  odaflowCustomerId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  totalAmount?: number;
  notes?: string;
  documentUrl?: string;
  salesRepName?: string;
  salesRepPhone?: string;
  customerNeedsMatch: boolean;
  erpPartyId?: string;
  erpPartyName?: string;
  lines: OdaflowQueueOrderLinePreview[];
}

export interface OdaflowQueueDetailResponse {
  item: OdaflowQueueItem;
  order: OdaflowQueueOrderPreview | null;
}

export interface OdaflowQueueResponse {
  items: OdaflowQueueItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface OdaflowMapping {
  _id: string;
  entityType: string;
  entityId: string;
  externalId: string;
  externalKey?: string;
  lastSyncedAt?: string;
}

export async function fetchOdaflowIntegrationApi(): Promise<OdaflowIntegrationApiResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowIntegrationApiResponse>("/api/settings/integrations/odaflow");
}

export async function updateOdaflowIntegrationApi(
  patch: Partial<Pick<OdaflowIntegrationApiResponse, "isActive" | "allowedManufacturerId">> & {
    hmacSecret?: string;
  }
): Promise<OdaflowIntegrationApiResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowIntegrationApiResponse>("/api/settings/integrations/odaflow", {
    method: "PATCH",
    body: patch,
  });
}

export async function generateOdaflowCredentialsApi(input: {
  allowedManufacturerId: string;
  rotate?: boolean;
}): Promise<OdaflowCredentialsApiResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowCredentialsApiResponse>(
    "/api/settings/integrations/odaflow/generate-credentials",
    {
      method: "POST",
      body: input,
    }
  );
}

export function getErpApiBaseFromFrontend(): string {
  return getApiBase() ?? "";
}

export async function fetchOdaflowSyncStatus(): Promise<OdaflowSyncStatus> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowSyncStatus>("/api/integrations/odaflow/sync/status");
}

export async function fetchOdaflowQueue(params: {
  status?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}): Promise<OdaflowQueueResponse> {
  requireLiveApi("Odaflow integration");
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.eventType) qs.set("eventType", params.eventType);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return apiRequest<OdaflowQueueResponse>(`/api/integrations/odaflow/sync/queue?${qs.toString()}`);
}

export async function fetchOdaflowQueueItem(id: string): Promise<OdaflowQueueDetailResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowQueueDetailResponse>(`/api/integrations/odaflow/sync/queue/${encodeURIComponent(id)}`);
}

export async function createSalesOrderFromQueueItem(
  id: string,
  body: {
    erpPartyId?: string;
    lineProducts?: Array<{ lineIndex: number; erpProductId: string }>;
    lineQty?: Array<{ lineIndex: number; qty: number }>;
    saveMappings?: boolean;
  }
): Promise<{ success: true; erpDocumentId: string; action: string }> {
  requireLiveApi("Odaflow integration");
  return apiRequest(`/api/integrations/odaflow/sync/queue/${encodeURIComponent(id)}/create-sales-order`, {
    method: "POST",
    body,
  });
}

export async function retryQueueItem(id: string): Promise<void> {
  requireLiveApi("Odaflow integration");
  await apiRequest(`/api/integrations/odaflow/sync/queue/${id}/retry`, { method: "POST" });
}

export async function ignoreQueueItem(id: string): Promise<void> {
  requireLiveApi("Odaflow integration");
  await apiRequest(`/api/integrations/odaflow/sync/queue/${id}/ignore`, { method: "POST" });
}

export interface OdaflowErmLookupMapping {
  externalId: string;
  externalKey?: string;
  lastSyncedAt?: string;
}

export async function lookupOdaflowErmByEntityId(params: {
  entityType: "product" | "party";
  entityId: string;
}): Promise<{ mappings: OdaflowErmLookupMapping[] }> {
  requireLiveApi("Odaflow integration");
  const qs = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
  });
  return apiRequest(`/api/integrations/odaflow/mappings/lookup?${qs.toString()}`);
}

export async function fetchOdaflowProductMappings(): Promise<{ items: OdaflowMapping[] }> {
  requireLiveApi("Odaflow integration");
  return apiRequest<{ items: OdaflowMapping[] }>("/api/integrations/odaflow/mappings/products");
}

export async function fetchOdaflowCustomerMappings(): Promise<{ items: OdaflowMapping[] }> {
  requireLiveApi("Odaflow integration");
  return apiRequest<{ items: OdaflowMapping[] }>("/api/integrations/odaflow/mappings/customers");
}
