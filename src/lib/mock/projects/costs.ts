/**
 * Mock linked transactions (bills, journals, expenses) for project costs.
 */

export type LinkedDocType = "bill" | "journal" | "expense";

export interface ProjectCostRow {
  id: string;
  projectId: string;
  docType: LinkedDocType;
  docId: string;
  docNumber: string;
  date: string;
  amount: number;
  currency: string;
  description?: string;
}

export const MOCK_PROJECT_COSTS: ProjectCostRow[] = [
  { id: "pc1", projectId: "p1", docType: "bill", docId: "1", docNumber: "BILL-1", date: "2025-01-15", amount: 125000, currency: "KES", description: "Forklift maintenance" },
  { id: "pc2", projectId: "p1", docType: "journal", docId: "j1", docNumber: "JE-001", date: "2025-01-20", amount: 45000, currency: "KES", description: "Allocation" },
  { id: "pc3", projectId: "p2", docType: "bill", docId: "2", docNumber: "BILL-2", date: "2025-01-10", amount: 185000, currency: "KES" },
];

export function getMockProjectCosts(projectId?: string): ProjectCostRow[] {
  let out = [...MOCK_PROJECT_COSTS];
  if (projectId) out = out.filter((c) => c.projectId === projectId);
  return out;
}
