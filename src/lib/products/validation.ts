/**
 * Product packaging & UOM validation.
 */

import type { ProductPackaging } from "@/lib/products/pricing-types";
import type { PackagingValidation } from "@/lib/products/types";
import { getUomByCode } from "@/lib/data/uom.repo";

export function validateProductPackaging(
  baseUom: string,
  rows: ProductPackaging[],
  options?: { checkUomCatalog?: boolean }
): PackagingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const uoms = new Set(rows.map((r) => r.uom));
  const checkCatalog = options?.checkUomCatalog ?? false;

  if (!baseUom?.trim()) errors.push("Missing base UOM.");

  const baseMissing = baseUom && !rows.some((r) => r.uom === baseUom);
  if (baseMissing) warnings.push(`Base UOM "${baseUom}" not present in packaging.`);

  let defaultSales = 0;
  let defaultPurchase = 0;
  let defaultOrder = 0;

  for (const r of rows) {
    if (r.unitsPer <= 0) errors.push(`${r.uom}: unitsPer must be > 0.`);
    if (r.baseUom && !uoms.has(r.baseUom) && r.baseUom !== baseUom)
      errors.push(`${r.uom}: baseUom "${r.baseUom}" not in list.`);
    if (r.uom === r.baseUom && r.unitsPer !== 1)
      errors.push(`${r.uom}: base UOM conversion must be 1.`);
    if (checkCatalog && getUomByCode(r.uom) == null) warnings.push(`${r.uom}: not in UOM catalog.`);
    if (r.isDefaultSalesUom) defaultSales++;
    if (r.isDefaultPurchaseUom) defaultPurchase++;
    if (r.isDefaultOrderUom) defaultOrder++;
  }

  if (defaultSales > 1) errors.push("At most one default sales UOM.");
  if (defaultPurchase > 1) errors.push("At most one default purchase UOM.");
  if (defaultOrder > 1) errors.push("At most one default order UOM.");

  return { ok: errors.length === 0, errors, warnings };
}
