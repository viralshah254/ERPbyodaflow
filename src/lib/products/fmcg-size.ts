/**
 * Canonical FMCG pack-size units + abbreviation aliases.
 * Keep in sync with ERPbyodaflow-backend/src/lib/fmcg-size.ts
 */

/** Pack size units for FMCG product size (SI: g = grams, L = litres). */
export const FMCG_SIZE_UOMS = ["g", "kg", "ml", "L", "cl", "pcs"] as const;
export type FmcgSizeUom = (typeof FMCG_SIZE_UOMS)[number];

/**
 * Known abbreviations → single canonical unit.
 * Keys are lowercase (lookup is case-insensitive).
 */
export const FMCG_SIZE_UNIT_ALIASES: Readonly<Record<string, FmcgSizeUom>> = {
  g: "g",
  gm: "g",
  gms: "g",
  gr: "g",
  gram: "g",
  grams: "g",

  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",

  ml: "ml",
  mls: "ml",
  millilitre: "ml",
  milliliter: "ml",
  millilitres: "ml",
  milliliters: "ml",

  l: "L",
  lt: "L",
  ltr: "L",
  ltrs: "L",
  litre: "L",
  liter: "L",
  litres: "L",
  liters: "L",

  cl: "cl",
  cls: "cl",
  centilitre: "cl",
  centiliter: "cl",

  pc: "pcs",
  pcs: "pcs",
  piece: "pcs",
  pieces: "pcs",
};

const UNIT_ALT = Object.keys(FMCG_SIZE_UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .join("|");

const SIZE_TOKEN_RE = new RegExp(
  `^\\s*(?:(\\d+(?:\\.\\d+)?)\\s*[xX]\\s*)?(\\d+(?:\\.\\d+)?)\\s*(${UNIT_ALT})\\s*$`,
  "i"
);

const SIZE_EMBEDDED_RE = new RegExp(
  `(?:(\\d+(?:\\.\\d+)?)\\s*[xX]\\s*)?(\\d+(?:\\.\\d+)?)\\s*(${UNIT_ALT})(?![a-zA-Z])`,
  "i"
);

export function canonicalizeFmcgSizeUnit(unit: string): FmcgSizeUom | undefined {
  const key = unit.trim().toLowerCase();
  if (!key) return undefined;
  return FMCG_SIZE_UNIT_ALIASES[key];
}

/**
 * Normalize a pack size label to one canonical form so abbreviations
 * (1kg / 1KG / 1lt / 1L / 500gm / 500g) are not treated as different sizes.
 */
export function normalizeFmcgSize(raw: string | null | undefined): string | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;

  const compact = trimmed.replace(/\s+/g, " ");
  const direct = SIZE_TOKEN_RE.exec(compact);
  if (direct) {
    return formatNormalizedSize(direct[1], direct[2], direct[3]);
  }

  const matches = [...compact.matchAll(new RegExp(SIZE_EMBEDDED_RE.source, "gi"))];
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    return formatNormalizedSize(last[1], last[2], last[3]);
  }

  return compact.replace(/\s+/g, "");
}

function formatNormalizedSize(
  packCount: string | undefined,
  qty: string,
  unitRaw: string
): string {
  const unit = canonicalizeFmcgSizeUnit(unitRaw) ?? unitRaw.toLowerCase();
  if (packCount) return `${packCount}x${qty}${unit}`;
  return `${qty}${unit}`;
}

/** Compose size value + UOM into one size string (e.g. 50g, 2L). */
export function composeFmcgSize(value: string, sizeUom: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  // Already looks like a full size token — normalize abbreviations
  if (SIZE_TOKEN_RE.test(v) || /x/i.test(v) || /\d\s*[a-zA-Z]+$/i.test(v)) {
    return normalizeFmcgSize(v);
  }
  const u = canonicalizeFmcgSizeUnit(sizeUom) ?? sizeUom.trim();
  if (!u) return normalizeFmcgSize(v) ?? v;
  return normalizeFmcgSize(`${v}${u}`) ?? `${v}${u}`;
}

/** Split a stored size string back into value + UOM for the edit UI. */
export function parseFmcgSize(size?: string | null): { value: string; uom: string } {
  const normalized = normalizeFmcgSize(size) ?? "";
  if (!normalized) return { value: "", uom: "g" };
  const m = normalized.match(new RegExp(`^(\\d+(?:\\.\\d+)?)(${UNIT_ALT})$`, "i"));
  if (!m) {
    // Multipack e.g. 12x330ml — keep whole string as value for free-text display
    return { value: normalized, uom: "g" };
  }
  const uom = canonicalizeFmcgSizeUnit(m[2]) ?? "g";
  return { value: m[1], uom };
}

/** Resolve FMCG pack size for line pickers — product.size first, then variant size. */
export function resolveFmcgProductSizeLabel(
  product?: { size?: string | null } | null,
  variants?: Array<{ size?: string | null; attributes?: Array<{ key?: string; value?: string }> }>
): string | undefined {
  const fromProduct = normalizeFmcgSize(product?.size);
  if (fromProduct) return fromProduct;

  for (const variant of variants ?? []) {
    const direct = normalizeFmcgSize(variant.size);
    if (direct) return direct;
    const fromAttr = normalizeFmcgSize(
      variant.attributes?.find((a) => a.key === "size" && a.value?.trim())?.value
    );
    if (fromAttr) return fromAttr;
  }

  return undefined;
}
