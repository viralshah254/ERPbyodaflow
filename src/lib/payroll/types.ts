/**
 * Payroll types — Kenya + Uganda, UI-first.
 */

export type EmploymentType = "FULL_TIME" | "CONSULTANT" | "CASUAL";
export type TaxCountry = "KE" | "UG";
export type ConsultantResidency = "RESIDENT" | "EAC_NON_RESIDENT" | "NON_RESIDENT";
export type SalaryType = "MONTHLY" | "HOURLY";
export type PaymentMethodStub = "BANK" | "M_PESA";

export type PayComponentType = "ALLOWANCE" | "DEDUCTION";

export interface PayComponent {
  id: string;
  code: string;
  name: string;
  type: PayComponentType;
  amount: number;
  isPercent?: boolean;
}

export interface Employee {
  id: string;
  name: string;
  idPassportMasked?: string;
  /** KRA PIN (Kenya) or URA TIN (Uganda) */
  taxId?: string;
  nssfNo?: string;
  shifNo?: string;
  department?: string;
  role?: string;
  branch?: string;
  employmentType: EmploymentType;
  taxCountry: TaxCountry;
  residency?: ConsultantResidency;
  salaryType: SalaryType;
  baseSalary: number;
  hourlyCostRate?: number;
  contractDailyRate?: number;
  currency: string;
  allowances: PayComponent[];
  deductions: PayComponent[];
  bankAccountMasked?: string;
  paymentMethod?: PaymentMethodStub;
}

export type PayRunStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PROCESSED" | "CANCELLED";

export interface StatBreakdown {
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  nssfTierIEmployee?: number;
  nssfTierIIEmployee?: number;
  nssfTierIEmployer?: number;
  nssfTierIIEmployer?: number;
  shif: number;
  ahl: number;
  lst: number;
  wht: number;
  payeTaxableIncome?: number;
  payePersonalRelief?: number;
  payeTaxBeforeRelief?: number;
}

export interface PayRunLine {
  id: string;
  employeeId: string;
  employeeName: string;
  employmentType?: EmploymentType;
  taxCountry?: TaxCountry;
  gross: number;
  statutoryTotal: number;
  net: number;
  currency: string;
  statBreakdown?: StatBreakdown;
  manualDeductionLines?: { label: string; amount: number }[];
  unpaidLeaveDays?: number;
  adjustments?: { label: string; amount: number }[];
}

export interface CalculatedLine {
  employeeId: string;
  employeeName: string;
  employmentType: EmploymentType;
  taxCountry: TaxCountry;
  currency: string;
  grossPay: number;
  statBreakdown: StatBreakdown;
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
  netPay: number;
  unpaidLeaveDays: number;
  /** True when employee is CASUAL — enter deductions manually before saving */
  requiresManualDeductions?: boolean;
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
  totalEmployerNssf?: number;
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
  employmentType?: EmploymentType;
  statBreakdown?: StatBreakdown;
  manualDeductionLines?: { label: string; amount: number }[];
  nssfEmployer?: number;
}

// Leave types
export type LeaveType = "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "PAID_EXTRA" | "UNPAID";
export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ExtraLeaveType {
  label: string;
  days: number;
  isPaid: boolean;
}

export interface LeavePolicy {
  id: string;
  country: TaxCountry;
  policyName: string;
  annualLeaveDays: number;
  sickLeaveDays: number;
  maternityLeaveDays: number;
  paternityLeaveDays: number;
  extraLeaveTypes: ExtraLeaveType[];
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  annualEntitled: number;
  annualUsed: number;
  annualRemaining: number;
  sickUsed: number;
  maternityUsed: number;
  paternityUsed: number;
  unpaidUsed: number;
  extraUsed: { label: string; used: number }[];
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  extraLabel?: string;
  startDate: string;
  endDate: string;
  days: number;
  isPaid: boolean;
  status: LeaveRequestStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}
