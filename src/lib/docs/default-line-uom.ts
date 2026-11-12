import type { ProductPackaging } from "@/lib/products/pricing-types";

export function documentLineBaseUom(product: { baseUom?: string | null; unit?: string | null }, fmcgOrg: boolean): string {
  return product.baseUom?.trim().toUpperCase() || product.unit?.trim().toUpperCase() || (fmcgOrg ? "PCS" : "EA");
}

export function activeDocumentAlternates(packaging: ProductPackaging[] = []): ProductPackaging[] {
  return packaging.filter((row) =>
    row.status !== "inactive" && row.uom.trim() && Number.isFinite(row.unitsPer) && row.unitsPer > 0
  );
}

export function defaultDocumentLineUom(args: {
  packaging: ProductPackaging[];
  mode: "sales" | "purchasing";
  baseUom?: string | null;
  unit?: string | null;
  fmcgOrg: boolean;
}): string {
  const alternates = activeDocumentAlternates(args.packaging);
  const preferred = alternates.find((row) =>
    args.mode === "purchasing" ? row.isDefaultPurchaseUom : row.isDefaultSalesUom
  );
  return preferred?.uom.trim().toUpperCase() || documentLineBaseUom(args, args.fmcgOrg);
}
