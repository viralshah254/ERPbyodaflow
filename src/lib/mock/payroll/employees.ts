/**
 * Mock payroll employees — Kenya-ready (KRA, NSSF, SHIF stubs).
 */

import type { Employee } from "@/lib/payroll/types";

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp1",
    name: "Jane Wanjiku",
    idPassportMasked: "***7890",
    taxId: "A001234567X",
    nssfNo: "NSSF-789012",
    shifNo: "SHIF-123456",
    department: "Finance",
    role: "Accountant",
    branch: "Head Office",
    employmentType: "FULL_TIME",
    taxCountry: "KE",
    salaryType: "MONTHLY",
    baseSalary: 85000,
    currency: "KES",
    allowances: [
      { id: "a1", code: "Housing", name: "Housing allowance", type: "ALLOWANCE", amount: 15000 },
    ],
    deductions: [
      { id: "d1", code: "NSSF", name: "NSSF", type: "DEDUCTION", amount: 1080 },
      { id: "d2", code: "SHIF", name: "SHIF", type: "DEDUCTION", amount: 2337 },
      { id: "d3", code: "PAYE", name: "PAYE", type: "DEDUCTION", amount: 12000 },
    ],
    bankAccountMasked: "***4567",
    paymentMethod: "BANK",
  },
  {
    id: "emp2",
    name: "John Kamau",
    idPassportMasked: "***2345",
    taxId: "A009876543Y",
    department: "Sales",
    role: "Sales Rep",
    branch: "East",
    employmentType: "CONSULTANT",
    taxCountry: "KE",
    salaryType: "MONTHLY",
    baseSalary: 55000,
    currency: "KES",
    allowances: [],
    deductions: [
      { id: "d4", code: "WHT", name: "WHT", type: "DEDUCTION", amount: 2750 },
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
