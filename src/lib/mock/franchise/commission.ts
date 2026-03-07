/**
 * Mock data for /franchise/commission — commission rules, runs, top-ups.
 */

export interface CommissionRuleRow {
  id: string;
  name: string;
  type: "PERCENT_SALES" | "FIXED_PER_UNIT";
  rate: number;
  periodType: "WEEKLY" | "MONTHLY";
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface CommissionRunLineRow {
  id: string;
  runId: string;
  franchiseeId: string;
  franchiseeName: string;
  salesAmount: number;
  commissionAmount: number;
  minFloor: number | null;
  topUpAmount: number;
  status: "OK" | "TOPUP";
}

export interface CommissionRunRow {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "POSTED";
  totalPayout: number;
  lineCount: number;
  createdAt: string;
  lines?: CommissionRunLineRow[];
}

export interface TopUpRow {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  runId: string;
  runNumber: string;
  amount: number;
  reason: string;
  status: "PENDING" | "POSTED";
  createdAt: string;
}

export const MOCK_COMMISSION_RULES: CommissionRuleRow[] = [
  { id: "cr1", name: "Standard weekly %", type: "PERCENT_SALES", rate: 12, periodType: "WEEKLY", effectiveFrom: "2025-01-01", effectiveTo: null, isActive: true },
  { id: "cr2", name: "Launch phase floor", type: "FIXED_PER_UNIT", rate: 5, periodType: "WEEKLY", effectiveFrom: "2025-01-01", effectiveTo: "2025-02-28", isActive: true },
];

export const MOCK_COMMISSION_RUNS: CommissionRunRow[] = [
  {
    id: "run1",
    number: "COMM-2025-W03",
    periodStart: "2025-01-13",
    periodEnd: "2025-01-19",
    status: "POSTED",
    totalPayout: 145200,
    lineCount: 8,
    createdAt: "2025-01-20T10:00:00Z",
    lines: [
      { id: "l1", runId: "run1", franchiseeId: "f1", franchiseeName: "Nairobi West Outlet", salesAmount: 280000, commissionAmount: 33600, minFloor: 25000, topUpAmount: 0, status: "OK" },
      { id: "l2", runId: "run1", franchiseeId: "f2", franchiseeName: "Kisumu Central", salesAmount: 180000, commissionAmount: 21600, minFloor: 25000, topUpAmount: 3400, status: "TOPUP" },
      { id: "l3", runId: "run1", franchiseeId: "f3", franchiseeName: "Mombasa Coast", salesAmount: 420000, commissionAmount: 50400, minFloor: 25000, topUpAmount: 0, status: "OK" },
    ],
  },
  {
    id: "run2",
    number: "COMM-2025-W04",
    periodStart: "2025-01-20",
    periodEnd: "2025-01-26",
    status: "DRAFT",
    totalPayout: 0,
    lineCount: 0,
    createdAt: "2025-01-27T09:00:00Z",
  },
];

export const MOCK_TOP_UPS: TopUpRow[] = [
  { id: "tu1", franchiseeId: "f2", franchiseeName: "Kisumu Central", runId: "run1", runNumber: "COMM-2025-W03", amount: 3400, reason: "Margin guarantee (below floor)", status: "POSTED", createdAt: "2025-01-20T11:00:00Z" },
];

export function getMockCommissionRules(): CommissionRuleRow[] {
  return [...MOCK_COMMISSION_RULES];
}

export function getMockCommissionRuns(params?: { status?: string }): CommissionRunRow[] {
  let out = MOCK_COMMISSION_RUNS.map((r) => ({ ...r, lines: r.lines ? [...r.lines] : undefined }));
  if (params?.status) {
    out = out.filter((r) => r.status === params.status);
  }
  return out;
}

export function getMockCommissionRunById(id: string): CommissionRunRow | null {
  return MOCK_COMMISSION_RUNS.find((r) => r.id === id) ?? null;
}

export function getMockTopUps(): TopUpRow[] {
  return [...MOCK_TOP_UPS];
}
