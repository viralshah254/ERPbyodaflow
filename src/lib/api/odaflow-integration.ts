/**
 * API client for the Odaflow → ERP integration admin endpoints.
 */
import { apiRequest } from "./client";

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

export async function fetchOdaflowSyncStatus(): Promise<OdaflowSyncStatus> {
  return apiRequest<OdaflowSyncStatus>("/integrations/odaflow/sync/status");
}

export async function fetchOdaflowQueue(params: {
  status?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}): Promise<OdaflowQueueResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.eventType) qs.set("eventType", params.eventType);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return apiRequest<OdaflowQueueResponse>(`/integrations/odaflow/sync/queue?${qs.toString()}`);
}

export async function retryQueueItem(id: string): Promise<void> {
  await apiRequest(`/integrations/odaflow/sync/queue/${id}/retry`, { method: "POST" });
}

export async function ignoreQueueItem(id: string): Promise<void> {
  await apiRequest(`/integrations/odaflow/sync/queue/${id}/ignore`, { method: "POST" });
}

export async function fetchOdaflowProductMappings(): Promise<{ items: OdaflowMapping[] }> {
  return apiRequest<{ items: OdaflowMapping[] }>("/integrations/odaflow/mappings/products");
}

export async function fetchOdaflowCustomerMappings(): Promise<{ items: OdaflowMapping[] }> {
  return apiRequest<{ items: OdaflowMapping[] }>("/integrations/odaflow/mappings/customers");
}
