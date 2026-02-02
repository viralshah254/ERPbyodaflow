/**
 * Mock tax codes for /settings/financial/taxes.
 */

export interface TaxRow {
  id: string;
  code: string;
  name: string;
  rate: number;
  inclusive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export const MOCK_TAXES: TaxRow[] = [
  { id: "1", code: "VAT16", name: "VAT 16%", rate: 16, inclusive: false, effectiveFrom: "2024-01-01", effectiveTo: null },
  { id: "2", code: "VAT0", name: "Zero rated", rate: 0, inclusive: false, effectiveFrom: "2024-01-01", effectiveTo: null },
  { id: "3", code: "WHT5", name: "Withholding 5%", rate: 5, inclusive: false, effectiveFrom: "2024-01-01", effectiveTo: null },
];

export function getMockTaxes(): TaxRow[] {
  return [...MOCK_TAXES];
}
