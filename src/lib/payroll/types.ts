/**
 * Payroll types — Kenya-ready, UI-first.
 */

export type EmploymentType = "PERMANENT" | "CONTRACT";
export type SalaryType = "MONTHLY" | "HOURLY";
export type PaymentMethodStub = "BANK" | "M_PESA";

export type PayComponentType = "ALLOWANCE" | "DEDUCTION";

export interface PayComponent {
  id: string;
  code: string;
  name: string;
  type: PayComponentType;
  amount: number;
  /** Optional fixed vs % of base */
  isPercent?: boolean;
}

export interface Employee {
  id: string;
  name: string;
  /** Masked display, e.g. "***1234" */
  idPassportMasked?: string;
  kraPin?: string;
  nhifNo?: string;
  nssfNo?: string;
  department?: string;
  role?: string;
  branch?: string;
  employmentType: EmploymentType;
  salaryType: SalaryType;
  baseSalary: number;
  currency: string;
  allowances: PayComponent[];
  deductions: PayComponent[];
  /** Masked, e.g. "***4567" */
  bankAccountMasked?: string;
  paymentMethod?: PaymentMethodStub;
}

export type PayRunStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PROCESSED";

export interface PayRunLine {
  id: string;
  employeeId: string;
  employeeName: string;
  gross: number;
  statutoryTotal: number;
  net: number;
  currency: string;
  /** Bonus, overtime, unpaid leave, loans */
  adjustments?: { label: string; amount: number }[];
}

export interface PayRun {
  id: string;
  number: string;
  month: string;
  branch?: string;
  currency: string;
  status: PayRunStatus;
  lineCount: number;
  totalGross: number;
  totalNet: number;
  createdAt?: string;
}

export interface Payslip {
  id: string;
  payRunId: string;
  employeeId: string;
  employeeName: string;
  month: string;
  gross: number;
  statutory: number;
  net: number;
  currency: string;
}
