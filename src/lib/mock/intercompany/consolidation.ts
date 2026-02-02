/**
 * Mock consolidation report (consolidated P&L).
 */

export interface ConsolidatedPLRow {
  id: string;
  label: string;
  entityAmounts: Record<string, number>;
  consolidated: number;
  currency: string;
}

export const MOCK_CONSOLIDATED_PL: ConsolidatedPLRow[] = [
  { id: "1", label: "Revenue", entityAmounts: { e1: 1200000, e2: 400000 }, consolidated: 1600000, currency: "KES" },
  { id: "2", label: "Cost of Sales", entityAmounts: { e1: -600000, e2: -200000 }, consolidated: -800000, currency: "KES" },
  { id: "3", label: "Gross Profit", entityAmounts: { e1: 600000, e2: 200000 }, consolidated: 800000, currency: "KES" },
  { id: "4", label: "Operating Expenses", entityAmounts: { e1: -200000, e2: -80000 }, consolidated: -280000, currency: "KES" },
  { id: "5", label: "Net Profit", entityAmounts: { e1: 400000, e2: 120000 }, consolidated: 520000, currency: "KES" },
];

export function getMockConsolidatedPL(): ConsolidatedPLRow[] {
  return [...MOCK_CONSOLIDATED_PL];
}
