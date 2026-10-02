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

export type ApprovalPolicyConfig = {
  version: number;
  rules: ApprovalPolicyRule[];
};

export async function fetchApprovalPolicyApi(): Promise<ApprovalPolicyConfig> {
  requireLiveApi("Approval policy");
  return apiRequest<ApprovalPolicyConfig>("/api/settings/approvals/policy");
}

export async function saveApprovalPolicyApi(
  version: number,
  rules: ApprovalPolicyRule[],
): Promise<ApprovalPolicyConfig> {
  requireLiveApi("Save approval policy");
  return apiRequest<ApprovalPolicyConfig>("/api/settings/approvals/policy", {
    method: "PUT",
    body: { version, rules },
  });
}
