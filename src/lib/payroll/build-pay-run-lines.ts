/**
 * Build pay run lines from employees (preview or client-side draft).
 * Used by pay-runs page; no mock dependency.
 */

import type { Employee, PayRunLine } from "@/lib/payroll/types";

export function buildPayRunLinesFromEmployees(
  employees: Employee[],
  payRunId: string,
  _month: string
): PayRunLine[] {
  return employees.map((e) => {
    const gross = e.baseSalary + (e.allowances?.reduce((s, a) => s + a.amount, 0) ?? 0);
    const statutory = (e.deductions?.filter((d) =>
      ["NSSF", "NHIF", "PAYE"].some((x) => d.name.toUpperCase().includes(x))
    ).reduce((s, d) => s + d.amount, 0) ?? 0);
    const otherDed = (e.deductions?.reduce((s, d) => s + d.amount, 0) ?? 0) - statutory;
    const net = gross - statutory - otherDed;
    return {
      id: `prl-${e.id}-${payRunId}`,
      employeeId: e.id,
      employeeName: e.name,
      gross,
      statutoryTotal: statutory,
      net,
      currency: e.currency ?? "KES",
    };
  });
}
