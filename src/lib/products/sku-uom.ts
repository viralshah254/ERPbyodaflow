/**
 * SKU-level UOM conversion helpers (FMCG) — mirrors backend sku-uom.ts.
 */

export type SkuUomStatus = "active" | "inactive";

export type SkuAlternateUom = {
  uom: string;
  factor: number;
  referenceUom: string;
  unitsPer: number;
  baseUom?: string;
  barcode?: string;
  isDefaultSalesUom?: boolean;
  isDefaultPurchaseUom?: boolean;
  isDefaultOrderUom?: boolean;
  isDefaultWarehouseUom?: boolean;
  isDefaultReportingUom?: boolean;
  status?: SkuUomStatus;
  explicitSalesPrice?: number;
};

export type PackBreakdownPart = { uom: string; qty: number };

export type QtyDisplayMode = "base" | "preferred" | "select" | "breakdown";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeUomCode(uom: string | undefined | null): string {
  return String(uom ?? "").trim().toUpperCase();
}

export const PACK_UOM_ALIAS_GROUPS: string[][] = [
  ["CTN", "CARTON", "CARTONS", "CS"],
  ["OUTER", "OUTERS", "OTR"],
  ["BALE", "BALES", "BL"],
  ["PK", "PACK", "PACKS"],
  ["BOX", "BOXES"],
  ["DOZEN", "DOZ"],
  ["PCS", "PC", "EA", "EACH", "PIECE", "UNIT", "RRP"],
  ["INNER", "INNERS"],
];

export function uomAliasGroup(uom: string): string[] {
  const u = normalizeUomCode(uom);
  for (const group of PACK_UOM_ALIAS_GROUPS) {
    if (group.includes(u)) return group;
  }
  return [u];
}

export function isPieceUomCode(uom: string | undefined | null): boolean {
  const u = normalizeUomCode(uom);
  return ["EA", "PC", "PCS", "PIECE", "RRP", "UNIT", "WHOLESALE"].includes(u);
}

function uomsMatch(a: string, b: string): boolean {
  return new Set(uomAliasGroup(a)).has(normalizeUomCode(b));
}

export function findAlternateForUom(
  rows: SkuAlternateUom[],
  uom: string
): SkuAlternateUom | undefined {
  const want = normalizeUomCode(uom);
  const exact = rows.find((r) => normalizeUomCode(r.uom) === want);
  if (exact) return exact;
  const group = uomAliasGroup(want);
  return rows.find((r) => group.includes(normalizeUomCode(r.uom)));
}

export function normalizeAlternateRow(
  raw: unknown,
  productBaseUom = "PCS"
): SkuAlternateUom | null {
  const r = asRecord(raw);
  const uom = normalizeUomCode(String(r.uom ?? ""));
  if (!uom) return null;
  const base = normalizeUomCode(productBaseUom) || "PCS";
  const legacyUnits =
    typeof r.unitsPer === "number" && Number.isFinite(r.unitsPer) && r.unitsPer > 0
      ? r.unitsPer
      : undefined;
  const hasExplicitFactor = typeof r.factor === "number" && Number.isFinite(r.factor);
  let factor = hasExplicitFactor ? (r.factor as number) : undefined;
  let referenceUom =
    typeof r.referenceUom === "string" && r.referenceUom.trim()
      ? normalizeUomCode(r.referenceUom)
      : undefined;
  if (!hasExplicitFactor || !referenceUom) {
    if (!hasExplicitFactor) factor = legacyUnits ?? 1;
    if (!referenceUom) referenceUom = base;
  }
  if (factor == null) factor = 1;
  const row: SkuAlternateUom = {
    uom,
    factor,
    referenceUom,
    unitsPer: legacyUnits ?? factor,
    baseUom: base,
    status: r.status === "inactive" ? "inactive" : "active",
  };
  if (typeof r.barcode === "string" && r.barcode.trim()) row.barcode = r.barcode.trim();
  if (r.isDefaultSalesUom === true) row.isDefaultSalesUom = true;
  if (r.isDefaultPurchaseUom === true) row.isDefaultPurchaseUom = true;
  if (r.isDefaultOrderUom === true) row.isDefaultOrderUom = true;
  if (r.isDefaultWarehouseUom === true) row.isDefaultWarehouseUom = true;
  if (r.isDefaultReportingUom === true) row.isDefaultReportingUom = true;
  if (
    typeof r.explicitSalesPrice === "number" &&
    Number.isFinite(r.explicitSalesPrice) &&
    r.explicitSalesPrice >= 0
  ) {
    row.explicitSalesPrice = r.explicitSalesPrice;
  }
  return row;
}

export function resolveFactorToBase(
  uom: string,
  rows: SkuAlternateUom[],
  productBaseUom = "PCS"
): number | null {
  const want = normalizeUomCode(uom);
  const base = normalizeUomCode(productBaseUom) || "PCS";
  if (!want) return null;
  if (uomsMatch(want, base) || isPieceUomCode(want)) return 1;

  const byCode = new Map<string, SkuAlternateUom>();
  for (const row of rows) {
    if (row.status === "inactive") continue;
    byCode.set(normalizeUomCode(row.uom), row);
  }

  let current = want;
  let hit = byCode.get(current);
  if (!hit) {
    const alt = findAlternateForUom(
      rows.filter((r) => r.status !== "inactive"),
      want
    );
    if (!alt) return null;
    current = normalizeUomCode(alt.uom);
  }

  let factor = 1;
  const visited = new Set<string>();
  while (true) {
    if (uomsMatch(current, base) || isPieceUomCode(current)) return factor;
    if (visited.has(current)) return null;
    visited.add(current);
    const row =
      byCode.get(current) ??
      findAlternateForUom(
        rows.filter((r) => r.status !== "inactive"),
        current
      );
    if (!row || !(row.factor > 0)) return null;
    factor *= row.factor;
    current = normalizeUomCode(row.referenceUom);
  }
}

export function recomputeBaseEquivalents(
  rows: SkuAlternateUom[],
  productBaseUom = "PCS"
): SkuAlternateUom[] {
  return rows.map((row) => {
    const unitsPer = resolveFactorToBase(row.uom, rows, productBaseUom);
    return {
      ...row,
      baseUom: normalizeUomCode(productBaseUom) || "PCS",
      unitsPer: unitsPer != null && unitsPer > 0 ? unitsPer : row.unitsPer,
    };
  });
}

export function validateSkuUomChain(
  rows: SkuAlternateUom[],
  productBaseUom = "PCS"
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const base = normalizeUomCode(productBaseUom) || "PCS";
  const seen = new Set<string>();

  for (const row of rows) {
    const uom = normalizeUomCode(row.uom);
    if (!uom) {
      errors.push("Alternate UOM code is required");
      continue;
    }
    if (seen.has(uom)) {
      errors.push(`Duplicate UOM "${uom}" on this SKU`);
      continue;
    }
    seen.add(uom);
    if (uomsMatch(uom, base)) {
      errors.push(`"${uom}" is the Base UOM — do not list it as an alternate`);
    }
    if (!(row.factor > 0) || !Number.isFinite(row.factor)) {
      errors.push(`"${uom}" conversion factor must be greater than zero`);
    }
    const ref = normalizeUomCode(row.referenceUom);
    if (!ref) {
      errors.push(`"${uom}" needs a reference UOM`);
      continue;
    }
    const refOk =
      uomsMatch(ref, base) ||
      isPieceUomCode(ref) ||
      rows.some((r) => uomsMatch(r.uom, ref) && normalizeUomCode(r.uom) !== uom);
    if (!refOk) {
      errors.push(`"${uom}" references unknown UOM "${ref}"`);
    }
  }

  for (const row of rows) {
    if (row.status === "inactive") continue;
    if (resolveFactorToBase(row.uom, rows, base) == null) {
      errors.push(
        `Cannot resolve "${row.uom}" to Base ${base} (missing link or circular chain)`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function prepareSkuAlternateUoms(
  rawRows: unknown[],
  productBaseUom = "PCS"
): { rows: SkuAlternateUom[]; validation: { ok: boolean; errors: string[]; warnings: string[] } } {
  const normalized = rawRows
    .map((r) => normalizeAlternateRow(r, productBaseUom))
    .filter((r): r is SkuAlternateUom => r != null);
  const validation = validateSkuUomChain(normalized, productBaseUom);
  const rows = validation.ok
    ? recomputeBaseEquivalents(normalized, productBaseUom)
    : normalized;
  return { rows, validation };
}

export function fromBaseQuantity(
  baseQty: number,
  uom: string,
  rows: SkuAlternateUom[],
  productBaseUom = "PCS"
): number | null {
  const factor = resolveFactorToBase(uom, rows, productBaseUom);
  if (factor == null || !(factor > 0)) return null;
  return (Number(baseQty) || 0) / factor;
}

export function packBreakdown(
  baseQty: number,
  rows: SkuAlternateUom[],
  productBaseUom = "PCS"
): PackBreakdownPart[] {
  const base = normalizeUomCode(productBaseUom) || "PCS";
  let remaining = Math.max(0, Math.floor(Number(baseQty) || 0));
  const active = recomputeBaseEquivalents(
    rows.filter((r) => r.status !== "inactive"),
    base
  )
    .filter((r) => r.unitsPer > 1)
    .sort((a, b) => b.unitsPer - a.unitsPer);

  const parts: PackBreakdownPart[] = [];
  for (const row of active) {
    const n = Math.floor(remaining / row.unitsPer);
    if (n <= 0) continue;
    parts.push({ uom: row.uom, qty: n });
    remaining -= n * row.unitsPer;
  }
  if (remaining > 0 || parts.length === 0) {
    parts.push({ uom: base, qty: remaining });
  }
  return parts;
}

export function formatPackBreakdown(parts: PackBreakdownPart[]): string {
  return parts.map((p) => `${p.qty} ${p.uom}`).join(" + ");
}

export function preferredDisplayUom(
  rows: SkuAlternateUom[],
  kind: "sales" | "purchase" | "warehouse" | "reporting" = "warehouse"
): string | null {
  const flag =
    kind === "sales"
      ? "isDefaultSalesUom"
      : kind === "purchase"
        ? "isDefaultPurchaseUom"
        : kind === "reporting"
          ? "isDefaultReportingUom"
          : "isDefaultWarehouseUom";
  const hit = rows.find((r) => r.status !== "inactive" && r[flag] === true);
  return hit ? normalizeUomCode(hit.uom) : null;
}

/** Format a base quantity for display under a View As mode. */
export function formatQtyAs(
  baseQty: number,
  mode: QtyDisplayMode,
  rows: SkuAlternateUom[],
  productBaseUom = "PCS",
  selectedUom?: string | null
): string {
  const base = normalizeUomCode(productBaseUom) || "PCS";
  const q = Number(baseQty) || 0;
  if (mode === "base") return `${q.toLocaleString()} ${base}`;
  if (mode === "breakdown") {
    return formatPackBreakdown(packBreakdown(q, rows, base));
  }
  const target =
    mode === "preferred"
      ? preferredDisplayUom(rows, "warehouse") || preferredDisplayUom(rows, "reporting") || base
      : normalizeUomCode(selectedUom) || base;
  if (uomsMatch(target, base) || isPieceUomCode(target)) {
    return `${q.toLocaleString()} ${base}`;
  }
  const converted = fromBaseQuantity(q, target, rows, base);
  if (converted == null) return `${q.toLocaleString()} ${base}`;
  const rounded =
    Math.abs(converted - Math.round(converted)) < 1e-9
      ? Math.round(converted).toLocaleString()
      : converted.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return `${rounded} ${normalizeUomCode(target)}`;
}

/** Live preview: 1 CTN = 4 INNER = 24 PCS */
export function formatConversionPreview(
  uom: string,
  factor: number,
  referenceUom: string,
  rows: SkuAlternateUom[],
  productBaseUom = "PCS"
): string {
  const base = normalizeUomCode(productBaseUom) || "PCS";
  const u = normalizeUomCode(uom);
  const ref = normalizeUomCode(referenceUom);
  const draft = recomputeBaseEquivalents(
    [
      ...rows.filter((r) => normalizeUomCode(r.uom) !== u),
      {
        uom: u,
        factor,
        referenceUom: ref,
        unitsPer: factor,
        baseUom: base,
        status: "active",
      },
    ],
    base
  );
  const unitsPer = resolveFactorToBase(u, draft, base);
  if (uomsMatch(ref, base) || isPieceUomCode(ref)) {
    return `1 ${u} = ${factor} ${ref}`;
  }
  if (unitsPer != null) {
    return `1 ${u} = ${factor} ${ref} = ${unitsPer} ${base}`;
  }
  return `1 ${u} = ${factor} ${ref}`;
}
