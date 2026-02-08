/**
 * Bank accounts repo: CRUD + localStorage overlay on mocks.
 */

import type { BankAccountRow } from "@/lib/mock/treasury/bank-accounts";
import { getMockBankAccounts } from "@/lib/mock/treasury/bank-accounts";

const KEY = "odaflow_bank_accounts";

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

export function listBankAccounts(): BankAccountRow[] {
  const stored = loadJson<BankAccountRow[]>(KEY);
  if (stored && Array.isArray(stored)) return stored;
  return getMockBankAccounts();
}

export function getBankAccountById(id: string): BankAccountRow | undefined {
  return listBankAccounts().find((a) => a.id === id);
}

export function createBankAccount(row: Omit<BankAccountRow, "id">): BankAccountRow {
  const list = listBankAccounts();
  const id = `ba${Date.now()}`;
  const created: BankAccountRow = { ...row, id };
  saveJson(KEY, [...list, created]);
  return created;
}

export function updateBankAccount(id: string, patch: Partial<BankAccountRow>): BankAccountRow | null {
  const list = listBankAccounts();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...patch } as BankAccountRow;
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY, next);
  return updated;
}
