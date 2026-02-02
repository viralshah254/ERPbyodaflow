/**
 * Mock pay runs and pay run lines.
 */

import type { Employee, PayRun, PayRunLine, Payslip } from "@/lib/payroll/types";
import { getMockEmployees } from "./employees";

export function buildPayRunLinesFromEmployees(
  employees: Employee[],
  payRunId: string,
  _month: string
): PayRunLine[] {
  return employees.map((e) => {
    const gross = e.baseSalary + e.allowances.reduce((s, a) => s + a.amount, 0);
    const statutory = e.deductions
      .filter((d) => ["NSSF", "NHIF", "PAYE"].some((x) => d.name.toUpperCase().includes(x)))
      .reduce((s, d) => s + d.amount, 0);
    const otherDed = e.deductions.reduce((s, d) => s + d.amount, 0) - statutory;
    const net = gross - statutory - otherDed;
    return {
      id: `prl-${e.id}-${payRunId}`,
      employeeId: e.id,
      employeeName: e.name,
      gross,
      statutoryTotal: statutory,
      net,
      currency: e.currency,
    };
  });
}

export const MOCK_PAY_RUNS: PayRun[] = [
  {
    id: "pr1",
    number: "PR-2025-01",
    month: "2025-01",
    branch: "Head Office",
    currency: "KES",
    status: "APPROVED",
    lineCount: 2,
    totalGross: 140000,
    totalNet: 111500,
    createdAt: "2025-01-25T10:00:00Z",
  },
  {
    id: "pr2",
    number: "PR-2024-12",
    month: "2024-12",
    branch: "Head Office",
    currency: "KES",
    status: "PROCESSED",
    lineCount: 2,
    totalGross: 140000,
    totalNet: 111500,
    createdAt: "2024-12-28T09:00:00Z",
  },
];

export function getMockPayRuns(): PayRun[] {
  return [...MOCK_PAY_RUNS];
}

export function getMockPayRunById(id: string): PayRun | undefined {
  return getMockPayRuns().find((r) => r.id === id);
}

export function getMockPayRunLines(payRunId: string): PayRunLine[] {
  const run = getMockPayRunById(payRunId);
  return run ? buildPayRunLinesFromEmployees(getMockEmployees(), payRunId, run.month) : [];
}

export function getMockPayslips(payRunId?: string): Payslip[] {
  const runs = payRunId ? [getMockPayRunById(payRunId)].filter(Boolean) as typeof MOCK_PAY_RUNS : MOCK_PAY_RUNS;
  const slips: Payslip[] = [];
  for (const r of runs) {
    const lines = getMockPayRunLines(r.id);
    for (const l of lines) {
      slips.push({
        id: `ps-${l.employeeId}-${r.id}`,
        payRunId: r.id,
        employeeId: l.employeeId,
        employeeName: l.employeeName,
        month: r.month,
        gross: l.gross,
        statutory: l.statutoryTotal,
        net: l.net,
        currency: l.currency,
      });
    }
  }
  return slips;
}
