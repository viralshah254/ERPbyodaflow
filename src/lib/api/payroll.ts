import type { Employee, PayRun, PayRunLine, Payslip } from "@/lib/payroll/types";
import { apiRequest, requireLiveApi } from "./client";
import type { StatutoryConfig } from "@/lib/types/payroll";

type BackendEmployee = {
  id: string;
  branchId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  department?: string;
  jobTitle?: string;
  salary?: number;
  hourlyCostRate?: number;
  currency?: string;
};

type BackendPayRunLine = {
  employeeId: string;
  grossPay: number;
  deductions?: number;
  netPay: number;
  currency?: string;
};

type BackendPayRun = {
  id: string;
  branchId?: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "CANCELLED";
  totalGross: number;
  totalDeductions?: number;
  totalNet: number;
  currency?: string;
  lines?: BackendPayRunLine[];
  createdAt?: string;
};

type BackendPayslip = {
  id: string;
  payRunId: string;
  employeeId: string;
  grossPay: number;
  deductions?: number;
  netPay: number;
  currency?: string;
  periodStart?: string;
};

function monthFromDate(value?: string): string {
  if (!value) return "";
  return value.slice(0, 7);
}

function mapPayRunStatus(status: BackendPayRun["status"]): PayRun["status"] {
  if (status === "PENDING_APPROVAL") return "SUBMITTED";
  if (status === "POSTED") return "PROCESSED";
  return status;
}

function mapEmployee(item: BackendEmployee): Employee {
  return {
    id: item.id,
    name: [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || item.employeeNumber,
    department: item.department,
    role: item.jobTitle,
    branch: item.branchId,
    employmentType: "PERMANENT",
    salaryType: "MONTHLY",
    baseSalary: item.salary ?? 0,
    hourlyCostRate: item.hourlyCostRate,
    currency: item.currency ?? "KES",
    allowances: [],
    deductions: [],
  };
}

function mapPayRun(item: BackendPayRun): PayRun {
  return {
    id: item.id,
    number: item.number,
    month: monthFromDate(item.periodStart),
    branch: item.branchId,
    currency: item.currency ?? "KES",
    status: mapPayRunStatus(item.status),
    lineCount: item.lines?.length ?? 0,
    totalGross: item.totalGross,
    totalNet: item.totalNet,
    createdAt: item.createdAt,
  };
}

function mapPayRunLines(item: BackendPayRun, employees: Employee[]): PayRunLine[] {
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  return (item.lines ?? []).map((line, index) => {
    const employee = employeeMap.get(line.employeeId);
    const statutoryTotal = line.grossPay - line.netPay;
    return {
      id: `${item.id}-${line.employeeId}-${index}`,
      employeeId: line.employeeId,
      employeeName: employee?.name ?? line.employeeId,
      gross: line.grossPay,
      statutoryTotal,
      net: line.netPay,
      currency: line.currency ?? item.currency ?? "KES",
    };
  });
}

export async function fetchEmployeesApi(): Promise<Employee[]> {
  requireLiveApi("Payroll employees");
  const data = await apiRequest<{ items: BackendEmployee[] }>("/api/payroll/employees");
  return data.items.map(mapEmployee);
}

export async function fetchEmployeeByIdApi(id: string): Promise<Employee | null> {
  requireLiveApi("Payroll employee detail");
  try {
    const data = await apiRequest<BackendEmployee>(`/api/payroll/employees/${encodeURIComponent(id)}`);
    return mapEmployee(data);
  } catch {
    return null;
  }
}

export async function createEmployeeApi(payload: {
  name: string;
  department?: string;
  branch?: string;
  baseSalary: number;
  hourlyCostRate?: number;
  currency?: string;
}): Promise<void> {
  requireLiveApi("Payroll employee creation");
  const trimmed = payload.name.trim();
  const [firstName, ...rest] = trimmed.split(/\s+/);
  const lastName = rest.join(" ") || "-";
  await apiRequest("/api/payroll/employees", {
    method: "POST",
    body: {
      employeeNumber: `EMP-${Date.now()}`,
      firstName: firstName || "Employee",
      lastName,
      department: payload.department,
      startDate: new Date().toISOString(),
      salary: payload.baseSalary,
      hourlyCostRate: payload.hourlyCostRate,
      currency: payload.currency ?? "KES",
      branchId: payload.branch,
    },
  });
}

export async function fetchPayRunsApi(): Promise<PayRun[]> {
  requireLiveApi("Payroll runs");
  const data = await apiRequest<{ items: BackendPayRun[] }>("/api/payroll/pay-runs");
  return data.items.map(mapPayRun);
}

export async function fetchPayRunDetailApi(
  id: string
): Promise<{ run: PayRun; lines: PayRunLine[] } | null> {
  requireLiveApi("Payroll run detail");
  const [run, employees] = await Promise.all([
    apiRequest<BackendPayRun>(`/api/payroll/pay-runs/${id}`),
    fetchEmployeesApi(),
  ]);
  return {
    run: mapPayRun(run),
    lines: mapPayRunLines(run, employees),
  };
}

export async function createPayRunApi(payload: {
  periodStart: string;
  periodEnd: string;
  branchId?: string;
  currency: string;
  lines: { employeeId: string; grossPay: number; deductions?: number }[];
}): Promise<{ id: string; number?: string }> {
  requireLiveApi("Payroll run creation");
  return apiRequest<{ id: string; number?: string }>("/api/payroll/pay-runs", {
    method: "POST",
    body: payload,
  });
}

export async function submitPayRunForApprovalApi(id: string): Promise<void> {
  requireLiveApi("Payroll approval submission");
  await apiRequest(`/api/payroll/pay-runs/${id}/action`, {
    method: "POST",
    body: { action: "request-approval" },
  });
}

export async function approvePayRunApi(id: string): Promise<void> {
  requireLiveApi("Payroll approval");
  await apiRequest(`/api/payroll/pay-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

export async function postPayRunJournalApi(id: string): Promise<void> {
  requireLiveApi("Payroll journal posting");
  await apiRequest(`/api/payroll/pay-runs/${id}/post-journal`, {
    method: "POST",
    body: {},
  });
}

export async function fetchPayslipsApi(payRunId?: string): Promise<Payslip[]> {
  requireLiveApi("Payroll payslips");
  const [data, employees] = await Promise.all([
    apiRequest<{ items: BackendPayslip[] }>("/api/payroll/payslips", {
      params: payRunId ? { payRunId } : undefined,
    }),
    fetchEmployeesApi(),
  ]);
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  return data.items.map((item) => ({
    id: item.id,
    payRunId: item.payRunId,
    employeeId: item.employeeId,
    employeeName: employeeMap.get(item.employeeId)?.name ?? item.employeeId,
    month: monthFromDate(item.periodStart),
    gross: item.grossPay,
    statutory: item.grossPay - item.netPay,
    net: item.netPay,
    currency: item.currency ?? "KES",
  }));
}

export async function fetchPayrollStatutoriesApi(): Promise<StatutoryConfig[]> {
  requireLiveApi("Payroll statutories");
  const data = await apiRequest<{ items: StatutoryConfig[] }>("/api/payroll/statutories");
  return data.items ?? [];
}

export type PayrollSettings = {
  currency: string;
  payFrequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY";
};

export async function fetchPayrollSettingsApi(): Promise<PayrollSettings> {
  requireLiveApi("Payroll settings");
  const data = await apiRequest<Partial<PayrollSettings>>("/api/settings/payroll");
  return {
    currency: data.currency ?? "KES",
    payFrequency: (data.payFrequency as PayrollSettings["payFrequency"]) ?? "MONTHLY",
  };
}

export async function savePayrollSettingsApi(patch: Partial<PayrollSettings>): Promise<PayrollSettings> {
  requireLiveApi("Save payroll settings");
  const body: Record<string, string> = {};
  if (patch.currency != null) body.currency = patch.currency;
  if (patch.payFrequency != null) body.payFrequency = patch.payFrequency;
  const data = await apiRequest<PayrollSettings>("/api/settings/payroll", {
    method: "PATCH",
    body,
  });
  return data;
}
