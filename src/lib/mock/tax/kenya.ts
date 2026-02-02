/**
 * Mock Kenya tax profile — VAT, WHT. Seeds generic tax tables.
 */

export interface KenyaVatRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  /** Exempt is special (no rate). */
  kind: "standard" | "zero" | "exempt";
}

export interface KenyaWhtCode {
  id: string;
  code: string;
  name: string;
  rate: number;
}

export interface KenyaTaxProfile {
  vatRegistered: boolean;
  /** Masked, e.g. P051234567X */
  vatPinMasked: string | null;
}

export interface TaxMapping {
  id: string;
  taxCode: string;
  mappingType: "vat_output" | "vat_input" | "wht_payable";
  coaAccountId: string;
  coaCode?: string;
  coaName?: string;
}

export const MOCK_KENYA_VAT_RATES: KenyaVatRate[] = [
  { id: "vat-s", code: "VAT16", name: "Standard VAT", rate: 16, kind: "standard" },
  { id: "vat-z", code: "VAT0", name: "Zero-rated", rate: 0, kind: "zero" },
  { id: "vat-e", code: "EXEMPT", name: "Exempt", rate: 0, kind: "exempt" },
];

export const MOCK_KENYA_WHT_CODES: KenyaWhtCode[] = [
  { id: "wht-5", code: "WHT-5", name: "Withholding 5%", rate: 5 },
  { id: "wht-10", code: "WHT-10", name: "Withholding 10%", rate: 10 },
  { id: "wht-15", code: "WHT-15", name: "Withholding 15%", rate: 15 },
];

export const MOCK_KENYA_PROFILE: KenyaTaxProfile = {
  vatRegistered: true,
  vatPinMasked: "P051234567X",
};

export const MOCK_TAX_MAPPINGS: TaxMapping[] = [
  { id: "m1", taxCode: "VAT16", mappingType: "vat_output", coaAccountId: "9", coaCode: "2110", coaName: "VAT Output" },
  { id: "m2", taxCode: "VAT16", mappingType: "vat_input", coaAccountId: "11", coaCode: "1130", coaName: "VAT Recoverable" },
  { id: "m3", taxCode: "WHT-5", mappingType: "wht_payable", coaAccountId: "10", coaCode: "2120", coaName: "WHT Payable" },
];

export function getMockKenyaProfile(): KenyaTaxProfile {
  return { ...MOCK_KENYA_PROFILE };
}

export function getMockKenyaVatRates(): KenyaVatRate[] {
  return [...MOCK_KENYA_VAT_RATES];
}

export function getMockKenyaWhtCodes(): KenyaWhtCode[] {
  return [...MOCK_KENYA_WHT_CODES];
}

export function getMockTaxMappings(): TaxMapping[] {
  return [...MOCK_TAX_MAPPINGS];
}
