/**
 * UOM catalog: definitions + global conversions.
 * Mock + localStorage. Used by /settings/uom and product packaging validation.
 */

import type { UomDefinition, UomConversion, UomValidation } from "@/lib/products/types";

const KEY_UOM = "odaflow_uom";
const KEY_CONVERSIONS = "odaflow_uom_conversions";

const MOCK_UOM: UomDefinition[] = [
  { id: "u1", code: "EA", name: "Each", category: "count", isBase: true, decimals: 0 },
  { id: "u2", code: "KG", name: "Kilogram", category: "weight", isBase: true, decimals: 3 },
  { id: "u3", code: "G", name: "Gram", category: "weight", factorToBase: 0.001, baseUom: "KG", decimals: 2 },
  { id: "u4", code: "TON", name: "Metric ton", category: "weight", factorToBase: 1000, baseUom: "KG", decimals: 2 },
  { id: "u5", code: "CTN", name: "Carton", category: "count", decimals: 0 },
  { id: "u6", code: "BDL", name: "Bundle", category: "count", decimals: 0 },
  { id: "u7", code: "BAG", name: "Bag", category: "count", decimals: 0 },
  { id: "u8", code: "BALE", name: "Bale", category: "count", decimals: 0 },
  { id: "u9", code: "L", name: "Litre", category: "volume", isBase: true, decimals: 2 },
  { id: "u10", code: "ML", name: "Millilitre", category: "volume", factorToBase: 0.001, baseUom: "L", decimals: 0 },
];

const MOCK_CONVERSIONS: UomConversion[] = [
  { id: "c1", fromUom: "G", toUom: "KG", factor: 0.001 },
  { id: "c2", fromUom: "TON", toUom: "KG", factor: 1000 },
  { id: "c3", fromUom: "ML", toUom: "L", factor: 0.001 },
];

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

export function listUoms(): UomDefinition[] {
  const stored = loadJson<UomDefinition[]>(KEY_UOM);
  if (stored && Array.isArray(stored)) return stored;
  return [...MOCK_UOM];
}

export function getUomByCode(code: string): UomDefinition | undefined {
  return listUoms().find((u) => u.code === code);
}

export function getUomById(id: string): UomDefinition | undefined {
  return listUoms().find((u) => u.id === id);
}

export function createUom(row: Omit<UomDefinition, "id">): UomDefinition {
  const list = listUoms();
  const id = `u${Date.now()}`;
  const created: UomDefinition = { ...row, id };
  saveJson(KEY_UOM, [...list, created]);
  return created;
}

export function updateUom(id: string, patch: Partial<UomDefinition>): UomDefinition | null {
  const list = listUoms();
  const idx = list.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx]!, ...patch };
  const next = [...list];
  next[idx] = updated;
  saveJson(KEY_UOM, next);
  return updated;
}

export function deleteUom(id: string): boolean {
  const list = listUoms().filter((u) => u.id !== id);
  if (list.length === listUoms().length) return false;
  saveJson(KEY_UOM, list);
  return true;
}

export function listConversions(): UomConversion[] {
  const stored = loadJson<UomConversion[]>(KEY_CONVERSIONS);
  if (stored && Array.isArray(stored)) return stored;
  return [...MOCK_CONVERSIONS];
}

export function saveConversion(c: UomConversion): void {
  const list = listConversions();
  const idx = list.findIndex((x) => x.id === c.id);
  const next = idx >= 0 ? [...list] : [...list, c];
  if (idx >= 0) next[idx] = c;
  else next[next.length - 1] = { ...c, id: c.id || `c${Date.now()}` };
  saveJson(KEY_CONVERSIONS, next);
}

export function deleteConversion(id: string): void {
  const list = listConversions().filter((x) => x.id !== id);
  saveJson(KEY_CONVERSIONS, list);
}

/** Build adjacency map for conversion graph. */
function buildConversionGraph(
  conversions: UomConversion[]
): Map<string, { to: string; factor: number }[]> {
  const g = new Map<string, { to: string; factor: number }[]>();
  for (const c of conversions) {
    const adj = g.get(c.fromUom) ?? [];
    adj.push({ to: c.toUom, factor: c.factor });
    g.set(c.fromUom, adj);
  }
  return g;
}

/** Detect conversion loops via DFS. */
function hasCycle(
  node: string,
  graph: Map<string, { to: string; factor: number }[]>,
  visited: Set<string>,
  stack: Set<string>
): boolean {
  visited.add(node);
  stack.add(node);
  for (const { to } of graph.get(node) ?? []) {
    if (!visited.has(to)) {
      if (hasCycle(to, graph, visited, stack)) return true;
    } else if (stack.has(to)) return true;
  }
  stack.delete(node);
  return false;
}

export function validateUomCatalog(): UomValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const uoms = listUoms();
  const conversions = listConversions();
  const codes = new Set(uoms.map((u) => u.code));

  for (const u of uoms) {
    if (!u.code?.trim()) errors.push("UOM has empty code.");
    if (u.decimals < 0) errors.push(`${u.code}: decimals must be >= 0.`);
    if (u.factorToBase != null && u.factorToBase <= 0)
      errors.push(`${u.code}: factorToBase must be > 0.`);
    if (u.baseUom && !codes.has(u.baseUom))
      errors.push(`${u.code}: baseUom "${u.baseUom}" not in catalog.`);
  }

  for (const c of conversions) {
    if (!codes.has(c.fromUom)) errors.push(`Conversion: fromUom "${c.fromUom}" not in catalog.`);
    if (!codes.has(c.toUom)) errors.push(`Conversion: toUom "${c.toUom}" not in catalog.`);
    if (c.factor <= 0) errors.push(`Conversion ${c.fromUom}→${c.toUom}: factor must be > 0.`);
  }

  const g = buildConversionGraph(conversions);
  const allNodes = new Set([...codes, ...conversions.flatMap((c) => [c.fromUom, c.toUom])]);
  const visited = new Set<string>();
  for (const n of allNodes) {
    if (visited.has(n)) continue;
    if (hasCycle(n, g, visited, new Set())) {
      errors.push("Conversion loop detected.");
      break;
    }
  }

  const baseUoms = uoms.filter((u) => u.isBase);
  if (baseUoms.length === 0) warnings.push("No base UOM defined.");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function resetUomFromMocks(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_UOM);
    localStorage.removeItem(KEY_CONVERSIONS);
  } catch {
    /* ignore */
  }
}
