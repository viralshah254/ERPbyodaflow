import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type ApprovalPolicyRule = {
  id: string;
  documentType: string;
  minAmount?: number;
  branchId?: string;
  makerCheckerRequired?: boolean;
  designatedApproverId?: string;
  isActive?: boolean;
};

export async function fetchApprovalPolicyApi(): Promise<{ rules: ApprovalPolicyRule[] }> {
  requireLiveApi("Approval policy");
  return apiRequest<{ rules: ApprovalPolicyRule[] }>("/api/settings/approvals/policy");
}

export async function saveApprovalPolicyApi(rules: ApprovalPolicyRule[]): Promise<{ rules: ApprovalPolicyRule[] }> {
  requireLiveApi("Save approval policy");
  return apiRequest<{ rules: ApprovalPolicyRule[] }>("/api/settings/approvals/policy", {
    method: "PUT",
    body: { rules },
  });
}
