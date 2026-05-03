export type OrgComplianceAttachmentSummary = {
  id: string;
  kind?: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
};

export interface OrgProfileRecord {
  id: string;
  name: string;
  taxId: string;
  registrationNumber: string;
  taxPinAttachment: OrgComplianceAttachmentSummary | null;
  certificateOfIncorporationAttachment: OrgComplianceAttachmentSummary | null;
}
