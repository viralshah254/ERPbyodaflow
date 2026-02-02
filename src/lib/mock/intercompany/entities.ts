/**
 * Mock entities (Company A, B) for intercompany / multi-entity UI.
 */

export interface EntityRow {
  id: string;
  code: string;
  name: string;
  baseCurrency: string;
  isReporting: boolean;
}

export const MOCK_ENTITIES: EntityRow[] = [
  { id: "e1", code: "KE", name: "OdaFlow Kenya", baseCurrency: "KES", isReporting: true },
  { id: "e2", code: "UG", name: "OdaFlow Uganda", baseCurrency: "UGX", isReporting: false },
];

export function getMockEntities(): EntityRow[] {
  return [...MOCK_ENTITIES];
}

export function getMockEntityById(id: string): EntityRow | undefined {
  return getMockEntities().find((e) => e.id === id);
}
