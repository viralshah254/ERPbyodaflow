/**
 * Mock payroll employees — Kenya-ready (KRA, NHIF, NSSF stubs).
 */

import type { Employee } from "@/lib/payroll/types";

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp1",
    name: "Jane Wanjiku",
    idPassportMasked: "***7890",
    kraPin: "A001234567X",
    nhifNo: "NHIF-123456",
    nssfNo: "NSSF-789012",
    department: "Finance",
    role: "Accountant",
    branch: "Head Office",
    employmentType: "PERMANENT",
    salaryType: "MONTHLY",
    baseSalary: 85000,
    currency: "KES",
    allowances: [
      { id: "a1", code: "Housing", name: "Housing allowance", type: "ALLOWANCE", amount: 15000 },
    ],
    deductions: [
      { id: "d1", code: "NSSF", name: "NSSF", type: "DEDUCTION", amount: 1080 },
      { id: "d2", code: "NHIF", name: "NHIF", type: "DEDUCTION", amount: 1700 },
      { id: "d3", code: "PAYE", name: "PAYE", type: "DEDUCTION", amount: 12000 },
    ],
    bankAccountMasked: "***4567",
    paymentMethod: "BANK",
  },
  {
    id: "emp2",
    name: "John Kamau",
    idPassportMasked: "***2345",
    kraPin: "A009876543Y",
    department: "Sales",
    role: "Sales Rep",
    branch: "East",
    employmentType: "CONTRACT",
    salaryType: "MONTHLY",
    baseSalary: 55000,
    currency: "KES",
    allowances: [],
    deductions: [
      { id: "d4", code: "NSSF", name: "NSSF", type: "DEDUCTION", amount: 720 },
      { id: "d5", code: "NHIF", name: "NHIF", type: "DEDUCTION", amount: 500 },
    ],
    bankAccountMasked: "***8901",
    paymentMethod: "M_PESA",
  },
];

export function getMockEmployees(): Employee[] {
  return [...MOCK_EMPLOYEES];
}

export function getMockEmployeeById(id: string): Employee | undefined {
  return getMockEmployees().find((e) => e.id === id);
}
