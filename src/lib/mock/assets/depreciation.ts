/**
 * Mock depreciation run for /assets/depreciation.
 */

export interface DepreciationJournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export interface DepreciationRunPreview {
  period: string;
  periodEnd: string;
  totalDepreciation: number;
  lines: DepreciationJournalLine[];
}

export const MOCK_DEPRECIATION_PREVIEW: DepreciationRunPreview = {
  period: "2025-01",
  periodEnd: "2025-01-31",
  totalDepreciation: 28500,
  lines: [
    { id: "l1", accountCode: "1500", accountName: "Fixed Assets - Accumulated", debit: 0, credit: 2500, description: "FA-001 Jan 2025" },
    { id: "l2", accountCode: "5100", accountName: "Depreciation Expense", debit: 2500, credit: 0, description: "FA-001 Jan 2025" },
    { id: "l3", accountCode: "1500", accountName: "Fixed Assets - Accumulated", debit: 0, credit: 12750, description: "FA-002 Jan 2025" },
    { id: "l4", accountCode: "5100", accountName: "Depreciation Expense", debit: 12750, credit: 0, description: "FA-002 Jan 2025" },
    { id: "l5", accountCode: "1500", accountName: "Fixed Assets - Accumulated", debit: 0, credit: 3750, description: "FA-003 Jan 2025" },
    { id: "l6", accountCode: "5100", accountName: "Depreciation Expense", debit: 3750, credit: 0, description: "FA-003 Jan 2025" },
  ],
};

function periodEnd(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(y, m, 0);
  return last.toISOString().slice(0, 10);
}

export function getMockDepreciationPreview(period?: string): DepreciationRunPreview {
  const p = period ?? MOCK_DEPRECIATION_PREVIEW.period;
  return { ...MOCK_DEPRECIATION_PREVIEW, period: p, periodEnd: periodEnd(p) };
}
