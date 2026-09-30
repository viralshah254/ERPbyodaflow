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
  createdByName?: string;
  createdByPhone?: string;
  createdAt?: string;
};

export type SfaCustomerApprovalList = {
  success: boolean;
  enabled: boolean;
  pendingCount: number;
  items: SfaCustomerApproval[];
};

export async function fetchSfaCustomerApprovalsApi(): Promise<SfaCustomerApprovalList> {
  requireLiveApi("SFA customer approvals");
  return apiRequest<SfaCustomerApprovalList>("/api/integrations/odaflow/customer-approvals");
}

export async function approveSfaCustomerApi(id: string): Promise<{ partyId: string }> {
  requireLiveApi("SFA customer approvals");
  return apiRequest<{ partyId: string }>(
    `/api/integrations/odaflow/customer-approvals/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: {} }
  );
}

export async function rejectSfaCustomerApi(id: string, reason?: string): Promise<void> {
  requireLiveApi("SFA customer approvals");
  await apiRequest(
    `/api/integrations/odaflow/customer-approvals/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: { reason } }
  );
}
