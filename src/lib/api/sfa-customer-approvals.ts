import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type SfaCustomerApproval = {
  _id: string;
  odaflowCustomerId: string;
  name: string;
  tradingName?: string;
  contactName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  customerCode?: string;
  address?: {
    line1?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  latitude?: number;
  longitude?: number;
  customerType?: string;
  channel?: string;
  sfaSegment?: string;
  sfaEntityType?: string;
  createdByName?: string;
  createdByPhone?: string;
  createdAt?: string;
};

export type SfaCustomerApprovalList = {
  success: boolean;
  enabled: boolean;
  pendingCount: number;
  totalCount: number;
  items: SfaCustomerApproval[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type FetchSfaCustomerApprovalsParams = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function fetchSfaCustomerApprovalsApi(
  params: FetchSfaCustomerApprovalsParams = {}
): Promise<SfaCustomerApprovalList> {
  requireLiveApi("SFA customer approvals");
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null && params.offset > 0) query.set("offset", String(params.offset));
  const qs = query.toString();
  return apiRequest<SfaCustomerApprovalList>(
    `/api/integrations/odaflow/customer-approvals${qs ? `?${qs}` : ""}`
  );
}

export async function approveSfaCustomerApi(id: string): Promise<{ partyId: string }> {
  requireLiveApi("SFA customer approvals");
  return apiRequest<{ partyId: string }>(
    `/api/integrations/odaflow/customer-approvals/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: {} }
  );
}

export type SfaCustomerApprovalEdits = {
  name: string;
  tradingName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  customerCode?: string;
  address?: {
    line1?: string;
    city?: string;
    region?: string;
    country?: string;
  };
};

export async function updateSfaCustomerApprovalApi(
  id: string,
  edits: SfaCustomerApprovalEdits
): Promise<SfaCustomerApproval> {
  requireLiveApi("SFA customer approvals");
  const result = await apiRequest<{ success: boolean; item: SfaCustomerApproval }>(
    `/api/integrations/odaflow/customer-approvals/${encodeURIComponent(id)}`,
    { method: "PATCH", body: edits }
  );
  return result.item;
}

export async function rejectSfaCustomerApi(id: string, reason?: string): Promise<void> {
  requireLiveApi("SFA customer approvals");
  await apiRequest(
    `/api/integrations/odaflow/customer-approvals/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: { reason } }
  );
}
