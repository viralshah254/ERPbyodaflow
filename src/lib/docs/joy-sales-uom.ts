import type { ProductRow } from "@/lib/types/masters";
import type { ProductPackaging } from "@/lib/products/pricing-types";

export function joyFinishedGoodSalesUnit(
  product: Pick<ProductRow, "name" | "size" | "baseUom" | "unit" | "productType" | "itemRole">,
  packaging?: ProductPackaging[],
  catalogPacks?: Array<{ uom: string; unitsPer: number }>,
): "PCS" | "PACK" | undefined {
  if ((product.itemRole ?? product.productType) !== "FINISHED") return;
  const stored = (product.baseUom ?? product.unit ?? "").trim();
  if (!/^(EA|EACH|PCS?|PIECE|UNIT|PK|PACK)$/i.test(stored)) return;
  const counts = [product.size, product.name].flatMap((value) =>
    [...(value ?? "").matchAll(/\b(?:(\d+)\s*-?\s*(?:PCS?|PIECES?)|PACK\s+OF\s+(\d+))\b/gi)].map((match) => Number(match[1] ?? match[2]))
  );
  if (/^(PK|PACK)$/i.test(stored)) return "PACK";
  if (!counts.some((pieces) => pieces > 1)) return "PCS";
  const retailPack = packaging?.find((row) => /^PACK$/i.test(row.uom.trim())) ??
    catalogPacks?.find((row) => /^PACK$/i.test(row.uom.trim()));
  return retailPack?.unitsPer === 1 ? "PACK" : "PCS";
}

/** Keep the legacy PK conversion distinct from one retail PACK of the finished SKU. */
export function joyRetailPackPricingRows(
  product: ProductRow | undefined,
  packaging: ProductPackaging[] | undefined,
  catalogPacks?: Array<{ uom: string; unitsPer: number }>,
): ProductPackaging[] | undefined {
  if (!product || joyFinishedGoodSalesUnit(product, packaging, catalogPacks) !== "PACK" ||
      packaging?.some((row) => /^PACK$/i.test(row.uom.trim()))) return packaging;
  const base = product.baseUom ?? product.unit ?? "PCS";
  if (/^(PACK|PK)$/i.test(base)) return packaging;
  return [...(packaging ?? []), { uom: "PACK", unitsPer: 1, baseUom: base }];
}
