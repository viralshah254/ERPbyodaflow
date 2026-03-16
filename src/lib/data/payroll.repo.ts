/**
 * Payroll repo: CRUD + localStorage. Prefer fetchEmployeesApi, fetchPayRunsApi, fetchPayRunDetailApi, fetchPayslipsApi for live data.
 */

import type { Employee, PayRun, PayRunLine, Payslip } from "@/lib/payroll/types";
import { buildPayRunLinesFromEmployees } from "@/lib/payroll/build-pay-run-lines";

const KEY_EMPLOYEES = "odaflow_payroll_employees";
const KEY_PAY_RUNS = "odaflow_payroll_payruns";

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function listEmployees(): Employee[] {
  const stored = loadJson<Employee[]>(KEY_EMPLOYEES);
  if (stored && Array.isArray(stored)) return stored;
  return [];
}

export function getEmployeeById(id: string): Employee | undefined {
  return listEmployees().find((e) => e.id === id);
}

export function createEmployee(row: Omit<Employee, "id">): Employee {
  const list = listEmployees();
  const id = `emp${Date.now()}`;
  const created: Employee = { ...row, id };
  saveJson(KEY_EMPLOYEES, [...list, created]);
  return created;
}

export function updateEmployee(id: string, patch: Partial<Employee>): Employee | null {
  const list = listEmployees();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_EMPLOYEES, next);
  return updated;
}

export function listPayRuns(): PayRun[] {
  const stored = loadJson<PayRun[]>(KEY_PAY_RUNS);
  if (stored && Array.isArray(stored)) return stored;
  return [];
}

export function getPayRunById(id: string): PayRun | undefined {
  return listPayRuns().find((r) => r.id === id);
}

export function createPayRun(run: Omit<PayRun, "id">): PayRun {
  const list = listPayRuns();
  const id = `pr${Date.now()}`;
  const created: PayRun = { ...run, id };
  saveJson(KEY_PAY_RUNS, [...list, created]);
  return created;
}

export function updatePayRun(id: string, patch: Partial<PayRun>): PayRun | null {
  const list = listPayRuns();
  const idx = list.findIndex((run) => run.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_PAY_RUNS, next);
  return updated;
}

export function requestPayRunApproval(id: string): PayRun | null {
  return updatePayRun(id, { status: "SUBMITTED" });
}

export function approvePayRun(id: string): PayRun | null {
  return updatePayRun(id, { status: "APPROVED" });
}

export function postPayRunJournal(id: string): PayRun | null {
  return updatePayRun(id, { status: "PROCESSED" });
}

export function listPayRunLines(payRunId: string): PayRunLine[] {
  const run = getPayRunById(payRunId);
  if (!run) return [];
  const employees = listEmployees();
  if (!employees.length) return [];
  return buildPayRunLinesFromEmployees(employees, run.id, run.month);
}

export function listPayslips(payRunId?: string): Payslip[] {
  const runs = listPayRuns();
  const run = payRunId ? runs.find((r) => r.id === payRunId) : undefined;
  if (run) {
    const lines = listPayRunLines(run.id);
    return lines.map((l) => ({
      id: `ps-${l.employeeId}-${run.id}`,
      payRunId: run.id,
      employeeId: l.employeeId,
      employeeName: l.employeeName,
      month: run.month,
      gross: l.gross,
      statutory: l.statutoryTotal,
      net: l.net,
      currency: l.currency,
    }));
  }
  return runs.flatMap((r) => listPayslips(r.id));
}

export function getPayslipById(id: string): Payslip | undefined {
  return listPayslips().find((s) => s.id === id);
}

export function resetPayrollFromMocks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_EMPLOYEES);
    localStorage.removeItem(KEY_PAY_RUNS);
  } catch {
    /* ignore */
  }
}
