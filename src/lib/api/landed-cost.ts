/**
 * Landed cost API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.6.
 */

import { apiRequest, getApiBase, requireLiveApi } from "@/lib/api/client";
import {
  type LandedCostTemplateRow,
  type LandedCostSourceRow,
} from "@/lib/mock/inventory/landed-cost";

export type { LandedCostTemplateRow, LandedCostSourceRow };

export async function fetchLandedCostTemplates(): Promise<LandedCostTemplateRow[]> {
  requireLiveApi("Landed cost templates");
  const res = await apiRequest<{ items: LandedCostTemplateRow[] }>("/api/inventory/landed-cost/templates");
  return res?.items ?? [];
}

export async function createLandedCostTemplate(body: {
  name: string;
  type: LandedCostTemplateRow["type"];
  allocationBasis: LandedCostTemplateRow["allocationBasis"];
  wizardGroup?: LandedCostTemplateRow["wizardGroup"];
  currency?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create landed cost template");
  return apiRequest<{ id: string }>("/api/inventory/landed-cost/templates", {
    method: "POST",
    body,
  });
}

export async function updateLandedCostTemplate(
  id: string,
  body: Partial<{
    name: string;
    type: LandedCostTemplateRow["type"];
    allocationBasis: LandedCostTemplateRow["allocationBasis"];
    wizardGroup: LandedCostTemplateRow["wizardGroup"];
    currency: string;
    isActive: boolean;
  }>
): Promise<void> {
  requireLiveApi("Update landed cost template");
  await apiRequest(`/api/inventory/landed-cost/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteLandedCostTemplate(id: string): Promise<void> {
  requireLiveApi("Delete landed cost template");
  await apiRequest(`/api/inventory/landed-cost/templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function reassignLandedCostTemplate(
  fromTemplateId: string,
  toTemplateId: string
): Promise<{ fromTemplateId: string; toTemplateId: string; allocationsUpdated: number }> {
  requireLiveApi("Reassign landed cost template");
  return apiRequest<{ fromTemplateId: string; toTemplateId: string; allocationsUpdated: number }>(
    `/api/inventory/landed-cost/templates/${encodeURIComponent(fromTemplateId)}/reassign`,
    { method: "POST", body: { toTemplateId } }
  );
}

export async function fetchLandedCostSources(params?: {
  type?: "grn" | "bill";
  dateFrom?: string;
  dateTo?: string;
}): Promise<LandedCostSourceRow[]> {
  requireLiveApi("Landed cost sources");
  const q: Record<string, string> = {};
  if (params?.type) q.type = params.type;
  if (params?.dateFrom) q.dateFrom = params.dateFrom;
  if (params?.dateTo) q.dateTo = params.dateTo;
  const res = await apiRequest<{ items: LandedCostSourceRow[] }>("/api/inventory/landed-cost/sources", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export async function fetchLandedCostSourceById(id: string): Promise<LandedCostSourceRow | null> {
  requireLiveApi("Landed cost source detail");
  try {
    return await apiRequest<LandedCostSourceRow>(`/api/inventory/landed-cost/sources/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export type LandedCostCostCentre = "currency_conversion" | "permits" | "inbound_logistics" | "other";

export interface LandedCostAllocationLine {
  templateId: string;
  /** Resolved template display name — present on GET allocation responses. */
  templateName?: string | null;
  amount: number;
  currency: string;
  reference?: string;
  costCentre?: LandedCostCostCentre;
}

export interface LandedCostAllocationRequest {
  sourceId: string;
  lines: LandedCostAllocationLine[];
}

export interface LandedCostAllocationResult {
  id?: string;
  allocationMethod?: string;
  totalLandedCost?: number;
  totalLandedCostBase?: number;
  costCentreSummary?: Record<string, { originalAmount: number; currency: string }>;
  posted?: boolean;
  impactLines?: Array<{
    productId: string;
    basisValue: number;
    allocatedAmount: number;
    byCostCentre?: Record<string, number>;
  }>;
}

export interface ExistingLandedCostAllocation {
  id: string;
  sourceId: string;
  sourceType: string;
  allocationMethod: string;
  lines: (LandedCostAllocationLine & { fxSnapshot?: unknown })[];
  impactLines: LandedCostAllocationResult["impactLines"];
  costCentreSummary?: LandedCostAllocationResult["costCentreSummary"];
  totalLandedCostBase?: LandedCostAllocationResult["totalLandedCostBase"];
  fxSnapshot?: unknown;
}

export async function fetchLandedCostAllocation(sourceId: string): Promise<ExistingLandedCostAllocation | null> {
  requireLiveApi("Landed cost allocation fetch");
  try {
    const res = await apiRequest<{ allocation: ExistingLandedCostAllocation | null }>(
      `/api/inventory/landed-cost/allocation/${encodeURIComponent(sourceId)}`
    );
    return res?.allocation ?? null;
  } catch {
    return null;
  }
}

export async function postLandedCostAllocation(body: LandedCostAllocationRequest): Promise<LandedCostAllocationResult> {
  requireLiveApi("Landed cost allocation");
  return apiRequest<LandedCostAllocationResult>("/api/inventory/landed-cost/allocation", {
    method: "POST",
    body,
  });
}

// ─── Evidence attachment helpers ─────────────────────────────────────────────

export interface LandedCostAttachmentRow {
  id: string;
  allocationId: string;
  lineIndex: number;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt?: string;
}

export async function fetchLandedCostAttachments(
  allocationId: string,
  lineIndex?: number
): Promise<LandedCostAttachmentRow[]> {
  requireLiveApi("Landed cost attachments");
  const params = new URLSearchParams();
  if (lineIndex !== undefined) params.set("lineIndex", String(lineIndex));
  const res = await apiRequest<{ items: LandedCostAttachmentRow[] }>(
    `/api/inventory/landed-cost/allocation/${encodeURIComponent(allocationId)}/attachments`,
    params.size > 0 ? { params } : undefined
  );
  return res?.items ?? [];
}

export async function uploadLandedCostAttachment(
  allocationId: string,
  lineIndex: number,
  file: File
): Promise<LandedCostAttachmentRow> {
  requireLiveApi("Upload landed cost attachment");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lineIndex", String(lineIndex));
  const url = `${getApiBase()}/api/inventory/landed-cost/allocation/${encodeURIComponent(allocationId)}/attachments`;
  const resp = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error((err as { error?: string }).error ?? "Upload failed");
  }
  return resp.json() as Promise<LandedCostAttachmentRow>;
}

export async function deleteLandedCostAttachment(
  allocationId: string,
  fileId: string
): Promise<void> {
  requireLiveApi("Delete landed cost attachment");
  await apiRequest(
    `/api/inventory/landed-cost/allocation/${encodeURIComponent(allocationId)}/attachments/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
}

export function getLandedCostAttachmentUrl(allocationId: string, fileId: string): string {
  return `/api/inventory/landed-cost/allocation/${encodeURIComponent(allocationId)}/attachments/${encodeURIComponent(fileId)}`;
}
