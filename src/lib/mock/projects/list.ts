/**
 * Mock projects for /projects/list and /projects/[id].
 */

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export interface ProjectRow {
  id: string;
  code: string;
  name: string;
  client: string;
  clientId?: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  budget: number;
  costCenterCode?: string;
  costCenterName?: string;
}

export const MOCK_PROJECTS: ProjectRow[] = [
  {
    id: "p1",
    code: "PRJ-001",
    name: "Warehouse Automation",
    client: "Internal",
    startDate: "2024-06-01",
    endDate: "2025-06-30",
    status: "ACTIVE",
    budget: 2500000,
    costCenterCode: "CC-WH",
    costCenterName: "Warehouse",
  },
  {
    id: "p2",
    code: "PRJ-002",
    name: "ERP Phase 2",
    client: "Internal",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "ACTIVE",
    budget: 1800000,
    costCenterCode: "CC-IT",
    costCenterName: "IT",
  },
];

export function getMockProjects(): ProjectRow[] {
  return [...MOCK_PROJECTS];
}

export function getMockProjectById(id: string): ProjectRow | undefined {
  return getMockProjects().find((p) => p.id === id);
}
