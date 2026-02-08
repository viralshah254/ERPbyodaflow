/**
 * Numbering sequences repo: CRUD + localStorage overlay on mocks.
 */

import type { SequenceRow } from "@/lib/mock/sequences";
import { getMockSequences } from "@/lib/mock/sequences";

const KEY = "odaflow_sequences";

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

export function listSequences(): SequenceRow[] {
  const stored = loadJson<SequenceRow[]>(KEY);
  if (stored && Array.isArray(stored)) return stored;
  return getMockSequences();
}

export function getSequenceById(id: string): SequenceRow | undefined {
  return listSequences().find((s) => s.id === id);
}

export function createSequence(row: Omit<SequenceRow, "id">): SequenceRow {
  const list = listSequences();
  const id = `seq${Date.now()}`;
  const created: SequenceRow = { ...row, id };
  saveJson(KEY, [...list, created]);
  return created;
}

export function updateSequence(id: string, patch: Partial<SequenceRow>): SequenceRow | null {
  const list = listSequences();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as SequenceRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY, next);
  return updated;
}
