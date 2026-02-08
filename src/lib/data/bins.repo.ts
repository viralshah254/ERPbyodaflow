/**
 * Bins repo: CRUD + localStorage overlay on mocks.
 */

import type { BinRow } from "@/lib/mock/warehouse/bins";
import { getMockBins } from "@/lib/mock/warehouse/bins";

const KEY = "odaflow_bins";

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

export function listBins(filters?: { warehouse?: string; zone?: string }): BinRow[] {
  const stored = loadJson<BinRow[]>(KEY);
  const base = stored && Array.isArray(stored) ? stored : getMockBins();
  let out = [...base];
  if (filters?.warehouse) out = out.filter((b) => b.warehouse === filters.warehouse);
  if (filters?.zone) out = out.filter((b) => b.zone === filters.zone);
  return out;
}

export function getBinById(id: string): BinRow | undefined {
  return listBins().find((b) => b.id === id);
}

export function createBin(row: Omit<BinRow, "id">): BinRow {
  const list = listBins();
  const id = `b${Date.now()}`;
  const created: BinRow = { ...row, id };
  saveJson(KEY, [...list, created]);
  return created;
}

export function updateBin(id: string, patch: Partial<BinRow>): BinRow | null {
  const list = listBins();
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as BinRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY, next);
  return updated;
}
