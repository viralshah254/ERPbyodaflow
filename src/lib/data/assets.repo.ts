/**
 * Assets repo: CRUD + localStorage overlay on mocks.
 */

import type { AssetRow, DepreciationMethod } from "@/lib/mock/assets/register";
import { getMockAssets } from "@/lib/mock/assets/register";

const KEY = "odaflow_assets";

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

export function listAssets(): AssetRow[] {
  const stored = loadJson<AssetRow[]>(KEY);
  if (stored && Array.isArray(stored)) return stored;
  return getMockAssets();
}

export function getAssetById(id: string): AssetRow | undefined {
  return listAssets().find((a) => a.id === id);
}

export function createAsset(row: Omit<AssetRow, "id">): AssetRow {
  const list = listAssets();
  const id = `a${Date.now()}`;
  const created: AssetRow = { ...row, id };
  saveJson(KEY, [...list, created]);
  return created;
}

export function updateAsset(id: string, patch: Partial<AssetRow>): AssetRow | null {
  const list = listAssets();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as AssetRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY, next);
  return updated;
}
