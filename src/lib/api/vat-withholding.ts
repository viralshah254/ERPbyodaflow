import { apiRequest, uploadFormData } from "./client";

export type VatWithholdingAgent = {
  id: string;
  name: string;
  code?: string;
  taxId?: string;
  status?: string;
  vatWithholding?: {
    agent?: boolean;
    matchMethod?: "PIN" | "LEGAL_NAME";
    withholderName?: string;
    pin?: string;
  };
};

export type VatWithholdingCertificate = {
  _id: string;
  certificateNo: string;
  withholderPin: string;
  withholderName: string;
  invoiceNo: string;
  certificateDate: string;
  amount: number;
  matchStatus: string;
  partyId?: string;
  documentId?: string;
  note?: string;
};

export type VatWithholdingReport = {
  rule: {
    enabled: boolean;
    rate: number;
    basis: "TAXABLE_VALUE" | "VAT_AMOUNT";
    effectiveFrom: string;
    toleranceKes: number;
  };
  agents: VatWithholdingAgent[];
  certificates: VatWithholdingCertificate[];
  counts: { agents: number; certificates: number; notFound: number; matched: number };
};

export type VatWithholdingImportResult = {
  parsedRows: number;
  declaredRecordCount: number | null;
  declaredTotalAmount: number | null;
  parsedAmount: number;
  rowShortfall: number | null;
  appointed: Array<{ partyId: string; partyName: string; pin: string; method: string; withholderName: string }>;
  notAppointed: Array<{ pin: string; withholderName: string; reason: string; detail: string }>;
  certificates: VatWithholdingCertificate[];
};

export function fetchVatWithholdingApi(): Promise<VatWithholdingReport> {
  return apiRequest<VatWithholdingReport>("/api/tax/vat-withholding");
}

export function importVatWithholdingApi(file: File): Promise<VatWithholdingImportResult> {
  const body = new FormData();
  body.append("file", file);
  return uploadFormData<VatWithholdingImportResult>("/api/tax/vat-withholding/import", body);
}
