import { isPieceUom } from "@/lib/fmcg/pricing";
import { fmcgSizeOrderUom } from "@/lib/products/fmcg-size";
import type { ProductPackaging } from "@/lib/products/pricing-types";

/** Unit stored on the product, with an FMCG size (35kg) winning over a piece default. */
export function documentLineBaseUom(product: {
  baseUom?: string | null;
  unit?: string | null;
  size?: string | null;
}, fmcgOrg: boolean): string {
  const stored = String(product.baseUom ?? product.unit ?? "").trim().toUpperCase();
  const fromSize = fmcgOrg ? fmcgSizeOrderUom(product.size) : undefined;
  if (fromSize && (!stored || isPieceUom(stored))) return fromSize;
  if (stored) return stored;
  return fmcgOrg ? "PCS" : "EA";
}

function pickDefaultUomFromPackaging(
  packaging: ProductPackaging[],
  mode: "sales" | "purchasing",
  fmcgOrg: boolean
): string | undefined {
  const usable = fmcgOrg
    ? packaging.filter((p) => Number.isFinite(p.unitsPer) && p.unitsPer > 1)
    : packaging;
  if (!usable.length) return undefined;
  if (mode === "purchasing") {
    const p = usable.find((x) => x.isDefaultPurchaseUom);
    if (p) return p.uom;
  }
  const s = usable.find((x) => x.isDefaultSalesUom);
  if (s) return s.uom;
  return usable[0]?.uom;
}

/**
 * Unit a new document line starts on.
 * A product whose base unit is KG or L stays on that unit.
 * Piece products still open on their default pack (carton, bale) when one is set.
 */
export function defaultDocumentLineUom(args: {
  packaging: ProductPackaging[];
  mode: "sales" | "purchasing";
  baseUom?: string | null;
  unit?: string | null;
  size?: string | null;
  fmcgOrg: boolean;
}): string {
  const base = documentLineBaseUom(args, args.fmcgOrg);
  const fromPack = pickDefaultUomFromPackaging(args.packaging, args.mode, args.fmcgOrg);
  const stored = String(args.baseUom ?? args.unit ?? "").trim().toUpperCase();
  const sizeSetsUnit = args.fmcgOrg && Boolean(fmcgSizeOrderUom(args.size)) && (!stored || isPieceUom(stored));
  if (fromPack && !sizeSetsUnit && (!base || isPieceUom(base))) return String(fromPack).trim().toUpperCase();
  if (base) return base;
  return args.fmcgOrg ? "PCS" : "EA";
}
