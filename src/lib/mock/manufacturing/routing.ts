/**
 * Mock routing: work centers, routes, operations.
 */

import type { WorkCenter, RouteRow, RouteOperation } from "@/lib/manufacturing/types";

export const MOCK_WORK_CENTERS: WorkCenter[] = [
  { id: "wc1", code: "WC-MIX", name: "Mixing", description: "Raw material mixing" },
  { id: "wc2", code: "WC-PACK", name: "Packing", description: "Packing line" },
  { id: "wc3", code: "WC-QC", name: "Quality Check", description: "QC station" },
];

export const MOCK_ROUTES: RouteRow[] = [
  { id: "route1", code: "R-GAMMA", name: "Gamma Production", description: "Formula production for Gamma" },
  { id: "route2", code: "R-WIDGET", name: "Widget Assembly", description: "Widget A/B assembly" },
];

export const MOCK_ROUTE_OPERATIONS: RouteOperation[] = [
  { id: "op1", routeId: "route1", sequence: 10, workCenterId: "wc1", name: "Mix", setupMinutes: 15, runMinutesPerUnit: 0.5 },
  { id: "op2", routeId: "route1", sequence: 20, workCenterId: "wc3", name: "QC sample", setupMinutes: 5, runMinutesPerUnit: 0.1 },
  { id: "op3", routeId: "route1", sequence: 30, workCenterId: "wc2", name: "Pack", setupMinutes: 10, runMinutesPerUnit: 0.2 },
  { id: "op4", routeId: "route2", sequence: 10, workCenterId: "wc2", name: "Assembly", setupMinutes: 20, runMinutesPerUnit: 1 },
  { id: "op5", routeId: "route2", sequence: 20, workCenterId: "wc3", name: "Inspect", setupMinutes: 5, runMinutesPerUnit: 0.5 },
];

export function getMockWorkCenters(): WorkCenter[] {
  return [...MOCK_WORK_CENTERS];
}

export function getMockRoutes(): RouteRow[] {
  return [...MOCK_ROUTES];
}

export function getMockRouteById(id: string): RouteRow | undefined {
  return MOCK_ROUTES.find((r) => r.id === id);
}

export function getMockRouteOperations(routeId: string): RouteOperation[] {
  return MOCK_ROUTE_OPERATIONS.filter((o) => o.routeId === routeId).sort((a, b) => a.sequence - b.sequence);
}
