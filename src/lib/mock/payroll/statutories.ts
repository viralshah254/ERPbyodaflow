/**
 * Mock Kenya statutories config (NSSF, NHIF, PAYE placeholder rates).
 */

export interface StatutoryConfig {
  id: string;
  code: string;
  name: string;
  rate?: number;
  cap?: number;
  currency: string;
}

export const MOCK_STATUTORIES: StatutoryConfig[] = [
  { id: "nssf", code: "NSSF", name: "NSSF", rate: 6, cap: 18000, currency: "KES" },
  { id: "nhif", code: "NHIF", name: "NHIF", currency: "KES" },
  { id: "paye", code: "PAYE", name: "PAYE", currency: "KES" },
];

export function getMockStatutories(): StatutoryConfig[] {
  return [...MOCK_STATUTORIES];
}
