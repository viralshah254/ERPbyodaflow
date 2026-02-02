/**
 * Routing repo: work centers, routes, operations. Stub + localStorage.
 */

import type { WorkCenter, RouteRow, RouteOperation } from "@/lib/manufacturing/types";
import {
  getMockWorkCenters,
  getMockRoutes,
  getMockRouteById,
  getMockRouteOperations,
} from "@/lib/mock/manufacturing/routing";

const KEY_WORK_CENTERS = "odaflow_work_centers";
const KEY_ROUTES = "odaflow_routes";
const KEY_ROUTE_OPERATIONS = "odaflow_route_operations";

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function listWorkCenters(): WorkCenter[] {
  const stored = loadJson<WorkCenter[]>(KEY_WORK_CENTERS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockWorkCenters();
}

export function getWorkCenterById(id: string): WorkCenter | undefined {
  return listWorkCenters().find((w) => w.id === id);
}

export function createWorkCenter(row: Omit<WorkCenter, "id">): WorkCenter {
  const list = listWorkCenters();
  const id = `wc${Date.now()}`;
  const created: WorkCenter = { ...row, id };
  saveJson(KEY_WORK_CENTERS, [...list, created]);
  return created;
}

export function updateWorkCenter(id: string, patch: Partial<WorkCenter>): WorkCenter | null {
  const list = listWorkCenters();
  const idx = list.findIndex((w) => w.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_WORK_CENTERS, next);
  return updated;
}

export function deleteWorkCenter(id: string): boolean {
  const next = listWorkCenters().filter((w) => w.id !== id);
  if (next.length === listWorkCenters().length) return false;
  saveJson(KEY_WORK_CENTERS, next);
  return true;
}

export function listRoutes(): RouteRow[] {
  const stored = loadJson<RouteRow[]>(KEY_ROUTES);
  if (stored && Array.isArray(stored)) return stored;
  return getMockRoutes();
}

export function getRouteById(id: string): RouteRow | undefined {
  const list = listRoutes();
  const found = list.find((r) => r.id === id);
  if (found) return found;
  return getMockRouteById(id);
}

export function createRoute(row: Omit<RouteRow, "id">): RouteRow {
  const list = listRoutes();
  const id = `route${Date.now()}`;
  const created: RouteRow = { ...row, id };
  saveJson(KEY_ROUTES, [...list, created]);
  return created;
}

export function updateRoute(id: string, patch: Partial<RouteRow>): RouteRow | null {
  const list = listRoutes();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_ROUTES, next);
  return updated;
}

export function deleteRoute(id: string): boolean {
  const next = listRoutes().filter((r) => r.id !== id);
  if (next.length === listRoutes().length) return false;
  saveJson(KEY_ROUTES, next);
  const stored = loadJson<RouteOperation[]>(KEY_ROUTE_OPERATIONS);
  if (stored && Array.isArray(stored)) {
    saveJson(KEY_ROUTE_OPERATIONS, stored.filter((o) => o.routeId !== id));
  }
  return true;
}

export function listRouteOperations(routeId: string): RouteOperation[] {
  const stored = loadJson<RouteOperation[]>(KEY_ROUTE_OPERATIONS);
  if (stored && Array.isArray(stored)) {
    const filtered = stored.filter((o) => o.routeId === routeId);
    if (filtered.length > 0) return filtered.sort((a, b) => a.sequence - b.sequence);
  }
  return getMockRouteOperations(routeId);
}

export function saveRouteOperations(routeId: string, operations: RouteOperation[]): void {
  const stored = loadJson<RouteOperation[]>(KEY_ROUTE_OPERATIONS);
  const existing = (stored && Array.isArray(stored) ? stored : []).filter((o) => o.routeId !== routeId);
  const normalized = operations.map((o) => ({ ...o, routeId }));
  saveJson(KEY_ROUTE_OPERATIONS, [...existing, ...normalized]);
}

export function createRouteOperation(routeId: string, row: Omit<RouteOperation, "id" | "routeId">): RouteOperation {
  const list = listRouteOperations(routeId);
  const id = `op${Date.now()}`;
  const created: RouteOperation = { ...row, id, routeId };
  saveRouteOperations(routeId, [...list, created]);
  return created;
}

export function updateRouteOperation(routeId: string, opId: string, patch: Partial<RouteOperation>): RouteOperation | null {
  const list = listRouteOperations(routeId);
  const idx = list.findIndex((o) => o.id === opId);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveRouteOperations(routeId, next);
  return updated;
}

export function deleteRouteOperation(routeId: string, opId: string): boolean {
  const next = listRouteOperations(routeId).filter((o) => o.id !== opId);
  if (next.length === listRouteOperations(routeId).length) return false;
  saveRouteOperations(routeId, next);
  return true;
}

export function resetRoutingFromMocks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_WORK_CENTERS);
    localStorage.removeItem(KEY_ROUTES);
    localStorage.removeItem(KEY_ROUTE_OPERATIONS);
  } catch {
    /* ignore */
  }
}
