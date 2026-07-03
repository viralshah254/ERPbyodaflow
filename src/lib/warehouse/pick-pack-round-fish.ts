import type { ProductRow } from "@/lib/types/masters";

/** Sized round-fish grades (S1–S10UP) are already split — not a mix line. */
const SIZED_ROUND_SKU_RE = /^TP-ROUND-(S[1-9]|S10UP)$/i;
const SIZED_PERCH_ROUND_SKU_RE = /^NP-ROUND-(SM|MD|LG)$/i;
const BREAKDOWN_SIZE_SKU_RE =
  /^(TP-GUTTED|TP-ROUND|NP-GUTTED|NP-ROUND)-(S[1-9]|S10UP|SM|MD|LG)$/i;

const MIX_SKUS = new Set(["TP-ROUND", "NP-ROUND", "TP-ROUND-MIX", "NP-ROUND-MIX"]);

/** True when this pick line is unsorted round fish that should be broken into size grades. */
export function isRoundFishMixLine(line: { productName?: string; sku?: string }): boolean {
  const sku = (line.sku ?? "").trim().toUpperCase();
  const name = (line.productName ?? "").trim();
  const nameLower = name.toLowerCase();

  if (MIX_SKUS.has(sku)) return true;
  if (SIZED_ROUND_SKU_RE.test(sku) || SIZED_PERCH_ROUND_SKU_RE.test(sku)) return false;
  if (/round fish.*\bmix\b/i.test(name)) return true;
  if (/uncategor/i.test(nameLower) && /round|fish|tilapia|perch/i.test(nameLower)) return true;
  if (nameLower.includes("round fish") && !/\bsize\b/.test(nameLower) && !/— size /i.test(name)) {
    return true;
  }
  return false;
}

/** Catalog search term when loading size products for the breakdown sheet. */
export function breakdownCatalogSearchTerm(line: { productName?: string; sku?: string }): string {
  const hint = (line.productName ?? line.sku ?? "").toLowerCase();
  if (/perch|np-/.test(hint)) return "nile perch gutted";
  if (/tilapia|tp-/.test(hint)) return "tilapia gutted";
  return "tilapia size";
}

function isPerchLine(line: { productName?: string; sku?: string }): boolean {
  return /perch|np-/i.test(line.productName ?? line.sku ?? "");
}

function productHasSizeGrade(p: Pick<ProductRow, "name" | "sku">): boolean {
  const sku = (p.sku ?? "").trim().toUpperCase();
  if (BREAKDOWN_SIZE_SKU_RE.test(sku)) return true;
  const name = p.name.toLowerCase();
  return /\bsize\b/.test(name) || /fresh tilapia/i.test(name);
}

function productMatchesLineSpecies(
  p: Pick<ProductRow, "name" | "sku">,
  line: { productName?: string; sku?: string }
): boolean {
  const sku = (p.sku ?? "").trim().toUpperCase();
  const name = p.name.toLowerCase();
  if (isPerchLine(line)) {
    return /perch|np-/i.test(name) || /^NP-/.test(sku);
  }
  return /tilapia|fresh/i.test(name) || /^TP-/.test(sku);
}

/** Sellable size-grade products to show in the breakdown sheet for a mix line. */
export function sizeProductsForBreakdown(
  products: ProductRow[],
  line: { productName?: string; sku?: string }
): ProductRow[] {
  return products
    .filter((p) => {
      const sku = (p.sku ?? "").trim().toUpperCase();
      if (MIX_SKUS.has(sku)) return false;
      if (!productHasSizeGrade(p)) return false;
      return productMatchesLineSpecies(p, line);
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}
