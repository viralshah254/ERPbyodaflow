import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type ComplianceSettings = {
  taxId?: string;
  invoiceTemplate?: string;
  eInvoice?: boolean;
  withholdingEnabled?: boolean;
  retentionDays?: number;
  dataResidency?: string | null;
};

export async function fetchComplianceSettingsApi(): Promise<ComplianceSettings> {
  requireLiveApi("Compliance settings");
  return apiRequest<ComplianceSettings>("/api/settings/compliance");
}

export async function updateComplianceSettingsApi(
  payload: Partial<ComplianceSettings>
): Promise<ComplianceSettings> {
  requireLiveApi("Update compliance settings");
  return apiRequest<ComplianceSettings>("/api/settings/compliance", {
    method: "PATCH",
    body: payload,
  });
}
