import { apiRequest } from "./client";
export type FmcgSetup = {
  version: string; capturedAt: string; orgId: string; openingDate: string | null; status: string; fiscalYearEndMonth: number | null; valuationMethod: string;
  gates: Array<{ id: string; title: string; status: "PASS" | "PENDING"; detail: string; href: string; required: boolean }>;
  taxProfile: { vatRegistration: string; withholdingVatAgent: string; inputTaxRecoverability: string; evidenceReference: string };
  totals: { stockRows: number; missingCostRows: number; physicalValue: number | null; wipValue: number | null; glValue: number | null; difference: number | null };
  readyForAcceptance: boolean; readOnlyPreview?: boolean;
};
export async function fetchFmcgSetup(): Promise<FmcgSetup> {
  try { return await apiRequest<FmcgSetup>("/api/settings/fmcg-setup"); }
  catch (error) {
    if ((error as { status?: number }).status === 404) {
      throw new Error("The connected ERP server does not support operational setup yet. Deploy the matching backend and verify its API routing, then retry. Your data has not been changed.");
    }
    throw error;
  }
}
