/** Pack size units for FMCG product size (SI: g = grams). */
export const FMCG_SIZE_UOMS = ["g", "kg", "ml", "L", "cl", "pcs"] as const;

/** Compose size value + UOM into one size string (e.g. 50g, 2L). */
export function composeFmcgSize(value: string, sizeUom: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  // Already looks like "500g" / "12x330ml" — keep as typed (normalize informal gm → g)
  if (/\d\s*(gm|g|kg|ml|l|cl|pcs)\s*$/i.test(v) || /x/i.test(v)) {
    return v.replace(/\s+/g, "").replace(/(\d)gm$/i, "$1g");
  }
  const u = sizeUom.trim() === "GM" ? "g" : sizeUom.trim();
  if (!u) return v;
  return `${v}${u}`;
}

/** Split a stored size string back into value + UOM for the edit UI. */
export function parseFmcgSize(size?: string | null): { value: string; uom: string } {
  const raw = size?.trim() ?? "";
  if (!raw) return { value: "", uom: "g" };
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*(gm|g|kg|ml|l|cl|pcs)$/i);
  if (!m) return { value: raw, uom: "g" };
  let uom = m[2];
  if (/^gm$/i.test(uom)) uom = "g";
  else if (/^l$/i.test(uom)) uom = "L";
  else if (!/^pcs$/i.test(uom)) uom = uom.toLowerCase();
  else uom = "pcs";
  return { value: m[1], uom };
}
