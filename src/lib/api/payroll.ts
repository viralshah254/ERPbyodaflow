import type {
  Employee,
  PayRun,
  PayRunLine,
  Payslip,
  CalculatedLine,
  LeavePolicy,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
} from "@/lib/payroll/types";
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
  contractDailyRate?: number;
  currency?: string;
  employmentType?: string;
  taxCountry?: string;
  taxId?: string;
  nssfNumber?: string;
  shifNumber?: string;
  residency?: string;
};

type BackendPayRunLine = {
  employeeId: string;
  employmentType?: string;
  taxCountry?: string;
  grossPay: number;
  deductions?: number;
  netPay: number;
  currency?: string;
  statBreakdown?: {
    paye?: number;
    nssfEmployee?: number;
    nssfEmployer?: number;
    shif?: number;
    ahl?: number;
    lst?: number;
    wht?: number;
  };
  unpaidLeaveDays?: number;
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
  totalEmployerNssf?: number;
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
    employmentType: (item.employmentType === "CONSULTANT" ? "CONSULTANT" : "FULL_TIME") as Employee["employmentType"],
    taxCountry: (item.taxCountry === "UG" ? "UG" : "KE") as Employee["taxCountry"],
    taxId: item.taxId,
    nssfNo: item.nssfNumber,
    shifNo: item.shifNumber,
    residency: item.residency as Employee["residency"],
    salaryType: "MONTHLY",
    baseSalary: item.salary ?? 0,
    hourlyCostRate: item.hourlyCostRate,
    contractDailyRate: item.contractDailyRate,
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
    totalEmployerNssf: item.totalEmployerNssf,
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
      employmentType: line.employmentType as PayRunLine["employmentType"],
      taxCountry: line.taxCountry as PayRunLine["taxCountry"],
      gross: line.grossPay,
      statutoryTotal,
      net: line.netPay,
      currency: line.currency ?? item.currency ?? "KES",
      statBreakdown: line.statBreakdown ? {
        paye: line.statBreakdown.paye ?? 0,
        nssfEmployee: line.statBreakdown.nssfEmployee ?? 0,
        nssfEmployer: line.statBreakdown.nssfEmployer ?? 0,
        shif: line.statBreakdown.shif ?? 0,
        ahl: line.statBreakdown.ahl ?? 0,
        lst: line.statBreakdown.lst ?? 0,
        wht: line.statBreakdown.wht ?? 0,
      } : undefined,
      unpaidLeaveDays: line.unpaidLeaveDays,
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
  firstName: string;
  lastName: string;
  department?: string;
  branch?: string;
  baseSalary: number;
  hourlyCostRate?: number;
  contractDailyRate?: number;
  currency?: string;
  employmentType?: "FULL_TIME" | "CONSULTANT";
  taxCountry?: "KE" | "UG";
  taxId?: string;
  nssfNumber?: string;
  shifNumber?: string;
  residency?: "RESIDENT" | "EAC_NON_RESIDENT" | "NON_RESIDENT";
  jobTitle?: string;
}): Promise<void> {
  requireLiveApi("Payroll employee creation");
  await apiRequest("/api/payroll/employees", {
    method: "POST",
    body: {
      employeeNumber: `EMP-${Date.now()}`,
      firstName: payload.firstName || "Employee",
      lastName: payload.lastName || "-",
      department: payload.department,
      jobTitle: payload.jobTitle,
      startDate: new Date().toISOString(),
      salary: payload.baseSalary,
      hourlyCostRate: payload.hourlyCostRate,
      contractDailyRate: payload.contractDailyRate,
      currency: payload.currency ?? "KES",
      branchId: payload.branch,
      employmentType: payload.employmentType ?? "FULL_TIME",
      taxCountry: payload.taxCountry ?? "KE",
      taxId: payload.taxId,
      nssfNumber: payload.nssfNumber,
      shifNumber: payload.shifNumber,
      residency: payload.residency,
    },
  });
}

export async function updateEmployeeApi(
  id: string,
  patch: Partial<{
    firstName: string;
    lastName: string;
    department: string;
    jobTitle: string;
    salary: number;
    hourlyCostRate: number;
    contractDailyRate: number;
    currency: string;
    employmentType: "FULL_TIME" | "CONSULTANT";
    taxCountry: "KE" | "UG";
    taxId: string;
    nssfNumber: string;
    shifNumber: string;
    residency: "RESIDENT" | "EAC_NON_RESIDENT" | "NON_RESIDENT";
    status: "ACTIVE" | "INACTIVE" | "TERMINATED";
  }>
): Promise<void> {
  requireLiveApi("Payroll employee update");
  await apiRequest(`/api/payroll/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
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

export async function calculatePayRunLinesApi(payload: {
  periodStart: string;
  employees: { employeeId: string; grossPay?: number; adjustments?: number; unpaidLeaveDays?: number }[];
}): Promise<CalculatedLine[]> {
  requireLiveApi("Payroll tax calculation");
  const data = await apiRequest<{ lines: CalculatedLine[] }>("/api/payroll/pay-runs/calculate", {
    method: "POST",
    body: payload,
  });
  return data.lines;
}

export async function createPayRunApi(payload: {
  periodStart: string;
  periodEnd: string;
  branchId?: string;
  currency: string;
  lines: {
    employeeId: string;
    grossPay: number;
    deductions?: number;
    statBreakdown?: {
      paye: number; nssfEmployee: number; nssfEmployer: number;
      shif: number; ahl: number; lst: number; wht: number;
    };
    employmentType?: string;
    taxCountry?: string;
    unpaidLeaveDays?: number;
  }[];
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

export async function fetchPayrollStatutoriesApi(country?: "KE" | "UG"): Promise<StatutoryConfig[]> {
  requireLiveApi("Payroll statutories");
  const params = country ? { country } : undefined;
  const data = await apiRequest<{ items?: StatutoryConfig[] } | Record<string, unknown>>(
    "/api/payroll/statutories",
    { params }
  );
  // New endpoint returns rich object, not {items:[]}
  if ("items" in data && Array.isArray(data.items)) return data.items as StatutoryConfig[];
  return [];
}

export async function fetchPayrollStatutoriesRawApi(country: "KE" | "UG" = "KE") {
  requireLiveApi("Payroll statutories reference");
  return apiRequest<Record<string, unknown>>("/api/payroll/statutories", {
    params: { country },
  });
}

export type PayrollSettings = {
  currency: string;
  payFrequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY";
  defaultTaxCountry?: "KE" | "UG";
};

export async function fetchPayrollSettingsApi(): Promise<PayrollSettings> {
  requireLiveApi("Payroll settings");
  const data = await apiRequest<Partial<PayrollSettings>>("/api/settings/payroll");
  return {
    currency: data.currency ?? "KES",
    payFrequency: (data.payFrequency as PayrollSettings["payFrequency"]) ?? "MONTHLY",
    defaultTaxCountry: (data.defaultTaxCountry as "KE" | "UG") ?? "KE",
  };
}

export async function savePayrollSettingsApi(patch: Partial<PayrollSettings>): Promise<PayrollSettings> {
  requireLiveApi("Save payroll settings");
  const body: Record<string, string> = {};
  if (patch.currency != null) body.currency = patch.currency;
  if (patch.payFrequency != null) body.payFrequency = patch.payFrequency;
  if (patch.defaultTaxCountry != null) body.defaultTaxCountry = patch.defaultTaxCountry;
  const data = await apiRequest<PayrollSettings>("/api/settings/payroll", {
    method: "PATCH",
    body,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Leave Management API
// ---------------------------------------------------------------------------

export async function fetchLeavePoliciesApi(): Promise<LeavePolicy[]> {
  requireLiveApi("Leave policies");
  const data = await apiRequest<{ items: LeavePolicy[] }>("/api/payroll/leave/policies");
  return data.items ?? [];
}

export async function createLeavePolicyApi(payload: Omit<LeavePolicy, "id">): Promise<{ id: string }> {
  requireLiveApi("Create leave policy");
  return apiRequest<{ id: string }>("/api/payroll/leave/policies", {
    method: "POST",
    body: payload,
  });
}

export async function updateLeavePolicyApi(id: string, patch: Partial<Omit<LeavePolicy, "id">>): Promise<void> {
  requireLiveApi("Update leave policy");
  await apiRequest(`/api/payroll/leave/policies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

function toQueryParams(p?: Record<string, string | number | undefined>): Record<string, string> | undefined {
  if (!p || Object.keys(p).length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return Object.keys(out).length ? out : undefined;
}

export async function fetchLeaveBalancesApi(params?: { employeeId?: string; year?: number }): Promise<LeaveBalance[]> {
  requireLiveApi("Leave balances");
  const data = await apiRequest<{ items: LeaveBalance[] }>("/api/payroll/leave/balances", {
    params: toQueryParams(params),
  });
  return data.items ?? [];
}

export async function fetchLeaveRequestsApi(params?: {
  employeeId?: string;
  status?: string;
  type?: string;
  year?: number;
  month?: number;
}): Promise<LeaveRequest[]> {
  requireLiveApi("Leave requests");
  const data = await apiRequest<{ items: LeaveRequest[] }>("/api/payroll/leave/requests", {
    params: toQueryParams(params),
  });
  return data.items ?? [];
}

export async function createLeaveRequestApi(payload: {
  employeeId: string;
  type: LeaveType;
  extraLabel?: string;
  startDate: string;
  endDate: string;
  days?: number;
  notes?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create leave request");
  return apiRequest<{ id: string }>("/api/payroll/leave/requests", {
    method: "POST",
    body: payload,
  });
}

export async function approveLeaveRequestApi(id: string): Promise<void> {
  requireLiveApi("Approve leave request");
  await apiRequest(`/api/payroll/leave/requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: {},
  });
}

export async function rejectLeaveRequestApi(id: string, reason?: string): Promise<void> {
  requireLiveApi("Reject leave request");
  await apiRequest(`/api/payroll/leave/requests/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export async function cancelLeaveRequestApi(id: string): Promise<void> {
  requireLiveApi("Cancel leave request");
  await apiRequest(`/api/payroll/leave/requests/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: {},
  });
}

export async function fetchLeaveCalendarApi(params: { year: number; month?: number }) {
  requireLiveApi("Leave calendar");
  return apiRequest<{
    events: {
      id: string;
      employeeId: string;
      employeeName: string;
      type: LeaveType;
      extraLabel?: string;
      startDate: string;
      endDate: string;
      days: number;
      isPaid: boolean;
    }[];
  }>("/api/payroll/leave/calendar", { params: toQueryParams(params) });
}
