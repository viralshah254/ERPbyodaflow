/**
 * Cycle count sessions repo: CRUD + localStorage overlay on mocks.
 */

import type { CycleCountSessionRow, CycleCountStatus } from "@/lib/mock/warehouse/cycle-counts";
import { getMockCycleCounts } from "@/lib/mock/warehouse/cycle-counts";

const KEY = "odaflow_cycle_counts";

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

export function listCycleCounts(): CycleCountSessionRow[] {
  const stored = loadJson<CycleCountSessionRow[]>(KEY);
  if (stored && Array.isArray(stored)) return stored;
  return getMockCycleCounts();
}

export function getCycleCountById(id: string): CycleCountSessionRow | undefined {
  return listCycleCounts().find((c) => c.id === id);
}

export function createCycleCountSession(row: Omit<CycleCountSessionRow, "id" | "number" | "status" | "lines"> & { warehouse: string; scope: "bin" | "category" | "full"; scopeDetail?: string }): CycleCountSessionRow {
  const list = listCycleCounts();
  const id = `cc${Date.now()}`;
  const nextNum = list.length + 1;
  const number = `CC-2025-${String(nextNum).padStart(3, "0")}`;
  const created: CycleCountSessionRow = {
    id,
    number,
    warehouse: row.warehouse,
    scope: row.scope,
    scopeDetail: row.scopeDetail,
    status: "OPEN" as CycleCountStatus,
    lines: [],
  };
  saveJson(KEY, [...list, created]);
  return created;
}

export function updateCycleCountSession(id: string, patch: Partial<CycleCountSessionRow>): CycleCountSessionRow | null {
  const list = listCycleCounts();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as CycleCountSessionRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY, next);
  return updated;
}
