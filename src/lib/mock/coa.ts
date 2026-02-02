/**
 * Mock Chart of Accounts for /settings/financial/chart-of-accounts.
 */

export type CoaAccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";
export type NormalBalance = "Dr" | "Cr";

export interface CoaRow {
  id: string;
  code: string;
  name: string;
  type: CoaAccountType;
  normalBalance: NormalBalance;
  isControlAccount: boolean;
  isActive: boolean;
  parentId: string | null;
}

export const MOCK_COA: CoaRow[] = [
  { id: "1", code: "1000", name: "Assets", type: "Asset", normalBalance: "Dr", isControlAccount: true, isActive: true, parentId: null },
  { id: "2", code: "1100", name: "Cash and Bank", type: "Asset", normalBalance: "Dr", isControlAccount: true, isActive: true, parentId: "1" },
  { id: "3", code: "1110", name: "Petty Cash", type: "Asset", normalBalance: "Dr", isControlAccount: false, isActive: true, parentId: "2" },
  { id: "4", code: "1120", name: "Main Bank", type: "Asset", normalBalance: "Dr", isControlAccount: false, isActive: true, parentId: "2" },
  { id: "5", code: "2000", name: "Liabilities", type: "Liability", normalBalance: "Cr", isControlAccount: true, isActive: true, parentId: null },
  { id: "6", code: "2100", name: "Payables", type: "Liability", normalBalance: "Cr", isControlAccount: true, isActive: true, parentId: "5" },
  { id: "9", code: "2110", name: "VAT Output", type: "Liability", normalBalance: "Cr", isControlAccount: false, isActive: true, parentId: "5" },
  { id: "10", code: "2120", name: "WHT Payable", type: "Liability", normalBalance: "Cr", isControlAccount: false, isActive: true, parentId: "5" },
  { id: "11", code: "1130", name: "VAT Recoverable", type: "Asset", normalBalance: "Dr", isControlAccount: false, isActive: true, parentId: "2" },
  { id: "7", code: "4000", name: "Revenue", type: "Income", normalBalance: "Cr", isControlAccount: true, isActive: true, parentId: null },
  { id: "8", code: "5000", name: "Expenses", type: "Expense", normalBalance: "Dr", isControlAccount: true, isActive: true, parentId: null },
];

export function getMockCOA(): CoaRow[] {
  return [...MOCK_COA];
}

export interface CoaRowWithDepth extends CoaRow {
  depth: number;
}

export function getMockCOARootFirst(): CoaRowWithDepth[] {
  const all = getMockCOA();
  const byParent = new Map<string | null, CoaRow[]>();
  for (const r of all) {
    const key = r.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(r);
  }
  const out: CoaRowWithDepth[] = [];
  function walk(pid: string | null, depth: number) {
    const children = byParent.get(pid) ?? [];
    for (const c of children) {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}
