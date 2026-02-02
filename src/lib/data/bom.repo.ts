/**
 * BOM repo: CRUD for BOMs, items, formula extras. localStorage + mocks.
 */

import type {
  BOMRow,
  BOMItemRow,
  FormulaCoProduct,
  FormulaByProduct,
  FormulaExtras,
} from "@/lib/manufacturing/types";
import {
  getMockBoms,
  getMockBomById,
  getMockBomItems,
  getMockFormulaExtras,
} from "@/lib/mock/manufacturing/boms";

const KEY_BOMS = "odaflow_boms";
const KEY_BOM_ITEMS = "odaflow_bom_items";
const KEY_FORMULA_EXTRAS = "odaflow_formula_extras";

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

export function listBoms(): BOMRow[] {
  const stored = loadJson<BOMRow[]>(KEY_BOMS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockBoms();
}

export function getBomById(id: string): BOMRow | undefined {
  const list = listBoms();
  return list.find((b) => b.id === id);
}

export function createBom(row: Omit<BOMRow, "id">): BOMRow {
  const list = listBoms();
  const id = `bom${Date.now()}`;
  const created: BOMRow = { ...row, id };
  saveJson(KEY_BOMS, [...list, created]);
  return created;
}

export function updateBom(id: string, patch: Partial<BOMRow>): BOMRow | null {
  const list = listBoms();
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_BOMS, next);
  return updated;
}

export function deleteBom(id: string): boolean {
  const next = listBoms().filter((b) => b.id !== id);
  if (next.length === listBoms().length) return false;
  saveJson(KEY_BOMS, next);
  const stored = loadJson<BOMItemRow[]>(KEY_BOM_ITEMS);
  if (stored && Array.isArray(stored)) {
    const rest = stored.filter((i) => i.bomId !== id);
    saveJson(KEY_BOM_ITEMS, rest);
  }
  const extras = loadJson<Record<string, FormulaExtras>>(KEY_FORMULA_EXTRAS);
  if (extras && extras[id]) {
    const { [id]: _, ...rest } = extras;
    saveJson(KEY_FORMULA_EXTRAS, rest);
  }
  return true;
}

export function listBomItems(bomId: string): BOMItemRow[] {
  const stored = loadJson<BOMItemRow[]>(KEY_BOM_ITEMS);
  if (stored && Array.isArray(stored)) {
    const filtered = stored.filter((i) => i.bomId === bomId);
    if (filtered.length > 0) return filtered;
  }
  return getMockBomItems(bomId);
}

export function saveBomItems(bomId: string, items: BOMItemRow[]): void {
  const all = loadJson<BOMItemRow[]>(KEY_BOM_ITEMS);
  const existing = (all && Array.isArray(all) ? all : []).filter((i) => i.bomId !== bomId);
  const normalized = items.map((i) => ({ ...i, bomId }));
  saveJson(KEY_BOM_ITEMS, [...existing, ...normalized]);
}

export function createBomItem(bomId: string, row: Omit<BOMItemRow, "id" | "bomId">): BOMItemRow {
  const list = listBomItems(bomId);
  const id = `bi${Date.now()}`;
  const created: BOMItemRow = { ...row, id, bomId };
  saveBomItems(bomId, [...list, created]);
  return created;
}

export function updateBomItem(bomId: string, itemId: string, patch: Partial<BOMItemRow>): BOMItemRow | null {
  const list = listBomItems(bomId);
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveBomItems(bomId, next);
  return updated;
}

export function deleteBomItem(bomId: string, itemId: string): boolean {
  const next = listBomItems(bomId).filter((i) => i.id !== itemId);
  if (next.length === listBomItems(bomId).length) return false;
  saveBomItems(bomId, next);
  return true;
}

export function getFormulaExtras(bomId: string): FormulaExtras {
  const stored = loadJson<Record<string, FormulaExtras>>(KEY_FORMULA_EXTRAS);
  if (stored && stored[bomId]) return stored[bomId]!;
  return getMockFormulaExtras(bomId);
}

export function saveFormulaExtras(bomId: string, extras: FormulaExtras): void {
  const all = loadJson<Record<string, FormulaExtras>>(KEY_FORMULA_EXTRAS) ?? {};
  all[bomId] = extras;
  saveJson(KEY_FORMULA_EXTRAS, all);
}

export function resetBomFromMocks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_BOMS);
    localStorage.removeItem(KEY_BOM_ITEMS);
    localStorage.removeItem(KEY_FORMULA_EXTRAS);
  } catch {
    /* ignore */
  }
}
