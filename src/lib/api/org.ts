import type { OrgProfileRecord, OrgComplianceAttachmentSummary } from "@/lib/types/org";
import { apiRequest, downloadFile, requireLiveApi, uploadFormData } from "./client";

/** URL segment for multipart upload + GET binary download. */
export type OrgComplianceDocKindSlug = "tax-pin" | "certificate-of-incorporation" | "logo";

type BackendOrg = {
  id: string;
  name?: string;
  taxId?: string;
  registrationNumber?: string;
  taxPinAttachment?: OrgComplianceAttachmentSummary | null;
  certificateOfIncorporationAttachment?: OrgComplianceAttachmentSummary | null;
  logoAttachment?: OrgComplianceAttachmentSummary | null;
};

function mapOrg(org: BackendOrg): OrgProfileRecord {
  return {
    id: String(org.id),
    name: org.name ?? "",
    taxId: org.taxId ?? "",
    registrationNumber: org.registrationNumber ?? "",
    taxPinAttachment: org.taxPinAttachment ?? null,
    certificateOfIncorporationAttachment:
      org.certificateOfIncorporationAttachment ?? null,
    logoAttachment: org.logoAttachment ?? null,
  };
}

export async function fetchOrgProfileApi(): Promise<OrgProfileRecord> {
  requireLiveApi("Organization profile");
  const org = await apiRequest<BackendOrg>("/api/org");
  return mapOrg(org);
}

export async function saveOrgProfileApi(payload: {
  name?: string;
  taxId?: string;
  registrationNumber?: string;
}): Promise<OrgProfileRecord> {
  requireLiveApi("Organization profile save");
  const org = await apiRequest<BackendOrg>("/api/org", {
    method: "PATCH",
    body: payload,
  });
  return mapOrg(org);
}

export async function uploadOrgComplianceDocApi(
  kind: OrgComplianceDocKindSlug,
  file: File
): Promise<OrgComplianceAttachmentSummary> {
  requireLiveApi("Organization documents");
  const form = new FormData();
  form.append("file", file);
  return uploadFormData<OrgComplianceAttachmentSummary>(`/api/org/compliance-docs/${kind}`, form);
}

export async function downloadOrgComplianceDoc(
  kind: OrgComplianceDocKindSlug,
  fallbackFileName: string,
  onError: (msg: string) => void
): Promise<void> {
  await downloadFile(`/api/org/compliance-docs/${kind}`, fallbackFileName, onError);
}
