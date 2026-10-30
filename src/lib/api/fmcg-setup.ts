import { apiRequest, getApiBase } from "./client";
export type FmcgSetup = {
  version: string; capturedAt: string; orgId: string; openingDate: string | null; status: string; fiscalYearEndMonth: number | null; valuationMethod: string;
  gates: Array<{ id: string; title: string; status: "PASS" | "PENDING"; detail: string; href: string; required: boolean }>;
  taxProfile: { vatRegistration: string; withholdingVatAgent: string; inputTaxRecoverability: string; evidenceReference: string };
  totals: { stockRows: number; missingCostRows: number; physicalValue: number | null; wipValue: number | null; glValue: number | null; difference: number | null };
  readyForAcceptance: boolean; readOnlyPreview?: boolean;
};
export async function fetchFmcgSetup(): Promise<FmcgSetup> {
  const path = "/api/settings/fmcg-setup";
  try { return await apiRequest<FmcgSetup>(path); }
  catch (error) {
    if ((error as { status?: number }).status === 404 && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname) && getApiBase() !== "http://localhost:4000") {
      const result = await apiRequest<FmcgSetup>(path, { baseUrl: "http://localhost:4000" });
      return { ...result, readOnlyPreview: true };
    }
    throw error;
  }
}
