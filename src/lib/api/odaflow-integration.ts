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

export interface OdaflowQueueOrderSummary {
  customerName?: string;
  odaflowCustomerId?: string;
  salesRepName?: string;
  salesRepPhone?: string;
  orderTitle?: string;
  channel?: string;
  purchaseOrderNumber?: string;
  totalAmount?: number;
  currency?: string;
  orderDate?: string;
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
    reason?: string;
    lineIndex?: number;
  }>;
  erpDocumentId?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
  rawPayload?: Record<string, unknown>;
  orderSummary?: OdaflowQueueOrderSummary | null;
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
  needsPriceMatch: boolean;
  hasIssue: boolean;
  blockReason?: string;
  isAutoMatched: boolean;
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
  matchedLineCount: number;
  totalLineCount: number;
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
  q?: string;
  customer?: string;
  salesRep?: string;
}): Promise<OdaflowQueueResponse> {
  requireLiveApi("Odaflow integration");
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.eventType) qs.set("eventType", params.eventType);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.customer?.trim()) qs.set("customer", params.customer.trim());
  if (params.salesRep?.trim()) qs.set("salesRep", params.salesRep.trim());
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
  odaflowName?: string;
  odaflowPackSize?: string;
  odaflowBarcode?: string;
  sfaProductKind?: "modern_trade" | "general_trade";
  displayLabel?: string;
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

export type CatalogSyncPending = {
  at: string;
  count: number;
  kind: string;
  label: string;
};

export type ErpSfaEnrollmentStatus = {
  enrolled: boolean;
  fmcg: boolean;
  integrationActive: boolean;
  integrationConfigured: boolean;
  manufacturerId: string | null;
  sfaErpManaged: boolean | null;
  reasons: string[];
  catalogSyncPending: CatalogSyncPending | null;
};

export async function fetchErpSfaEnrollmentApi(): Promise<ErpSfaEnrollmentStatus> {
  requireLiveApi("Odaflow enrollment");
  return apiRequest<ErpSfaEnrollmentStatus>("/api/integrations/odaflow/enrollment");
}

export type SharedCatalogPullResult = {
  success: boolean;
  hqs: number;
  branches: number;
  failed: number;
};

export async function pullSharedCatalogFromSfaApi(): Promise<SharedCatalogPullResult> {
  requireLiveApi("Shared catalog pull");
  return apiRequest<SharedCatalogPullResult>("/api/integrations/odaflow/shared-catalog/pull", {
    method: "POST",
    body: {},
  });
}

export type ProductSfaSyncStatusRow = {
  productId: string;
  barcode?: string;
  name?: string;
  generalTrade: { linked: boolean; externalId?: string; lastSyncedAt?: string };
  modernTrade: { linked: boolean; externalId?: string; lastSyncedAt?: string };
};

export async function fetchProductSfaSyncStatusApi(
  productIds: string[]
): Promise<{ items: ProductSfaSyncStatusRow[] }> {
  requireLiveApi("Product SFA sync status");
  const qs = new URLSearchParams({ productIds: productIds.join(",") });
  return apiRequest(`/api/integrations/odaflow/products/sync-status?${qs.toString()}`);
}

export type ProductSfaSyncResult = {
  created: { gt: number; mt: number };
  updated: { gt: number; mt: number };
  skipped: Array<{ productId: string; barcode?: string; reason: string }>;
  warnings: Array<{ productId: string; barcode?: string; reason: string }>;
};

export async function syncProductsToSfaApi(body: {
  productIds: string[];
  catalogs: Array<"general_trade" | "modern_trade">;
  priceListId: string;
  dryRun?: boolean;
}): Promise<ProductSfaSyncResult> {
  requireLiveApi("Product SFA sync");
  return apiRequest<ProductSfaSyncResult>("/api/integrations/odaflow/products/sync", {
    method: "POST",
    body,
  });
}

export type SfaSyncSettings = {
  defaultPriceListId: string | null;
  defaultCatalogs: Array<"general_trade" | "modern_trade">;
};

export async function fetchSfaSyncSettingsApi(): Promise<SfaSyncSettings> {
  requireLiveApi("SFA sync settings");
  return apiRequest<SfaSyncSettings>("/api/integrations/odaflow/products/sync-settings");
}

export async function updateSfaSyncSettingsApi(
  body: Partial<SfaSyncSettings>
): Promise<SfaSyncSettings> {
  requireLiveApi("SFA sync settings");
  return apiRequest<SfaSyncSettings>("/api/integrations/odaflow/products/sync-settings", {
    method: "PATCH",
    body,
  });
}

export type SfaProductSyncOverview = {
  totalProducts: number;
  activeProducts: number;
  withBarcode: number;
  missingBarcode: number;
  gtLinked: number;
  mtLinked: number;
  unlinked: number;
  /** False when live SFA barcode lookup failed (tunnel / ODAFLOW_MONGO_URI). */
  sfaLookupOk?: boolean;
};

export type SfaUnlinkedProduct = {
  productId: string;
  sku?: string;
  name: string;
  barcode?: string;
  status: string;
  gtOnSfa: boolean;
  mtOnSfa: boolean;
  gtLinked: boolean;
  mtLinked: boolean;
};

export async function fetchSfaProductSyncOverviewApi(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  overview: SfaProductSyncOverview;
  unlinked: { items: SfaUnlinkedProduct[]; total: number; sfaLookupOk?: boolean };
}> {
  requireLiveApi("SFA product sync overview");
  const qs = new URLSearchParams();
  if (opts?.search) qs.set("search", opts.search);
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  if (opts?.offset != null) qs.set("offset", String(opts.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/api/integrations/odaflow/products/sync-overview${suffix}`);
}

export type SfaBulkSyncProgress = {
  done: number;
  total: number;
  phase: "syncing" | "done";
};

const SFA_SYNC_BATCH_SIZE = 20;

export async function syncProductsToSfaBatchedApi(
  body: {
    productIds: string[];
    catalogs: Array<"general_trade" | "modern_trade">;
    priceListId: string;
  },
  onProgress?: (p: SfaBulkSyncProgress) => void
): Promise<ProductSfaSyncResult> {
  const ids = [...new Set(body.productIds.map((id) => id.trim()).filter(Boolean))];
  const aggregate: ProductSfaSyncResult = {
    created: { gt: 0, mt: 0 },
    updated: { gt: 0, mt: 0 },
    skipped: [],
    warnings: [],
  };

  if (!ids.length) return aggregate;

  onProgress?.({ done: 0, total: ids.length, phase: "syncing" });

  for (let i = 0; i < ids.length; i += SFA_SYNC_BATCH_SIZE) {
    const batch = ids.slice(i, i + SFA_SYNC_BATCH_SIZE);
    const res = await syncProductsToSfaApi({
      productIds: batch,
      catalogs: body.catalogs,
      priceListId: body.priceListId,
    });
    aggregate.created.gt += res.created.gt;
    aggregate.created.mt += res.created.mt;
    aggregate.updated.gt += res.updated.gt;
    aggregate.updated.mt += res.updated.mt;
    aggregate.skipped.push(...res.skipped);
    aggregate.warnings.push(...res.warnings);
    onProgress?.({
      done: Math.min(i + batch.length, ids.length),
      total: ids.length,
      phase: "syncing",
    });
  }

  onProgress?.({ done: ids.length, total: ids.length, phase: "done" });
  return aggregate;
}
