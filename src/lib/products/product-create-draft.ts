export type ProductCreatePackRow = { uom: string; unitsPer: string };

export type ProductCreateDraft = {
  savedAt: string;
  step: 1 | 2;
  sku: string;
  code: string;
  barcode: string;
  size: string;
  sizeValue: string;
  sizeUom: string;
  name: string;
  productType: "RAW" | "FINISHED" | "BOTH" | "";
  categoryId: string;
  productFamily: string;
  unit: string;
  defaultTaxCodeId: string;
  createPackRows: ProductCreatePackRow[];
};

const PREFIX = "erp.product-create-draft.v1.";

export function productCreateDraftKey(orgId: string): string {
  return `${PREFIX}${orgId}`;
}

export function loadProductCreateDraft(orgId: string): ProductCreateDraft | null {
  if (typeof window === "undefined" || !orgId) return null;
  try {
    const raw = window.localStorage.getItem(productCreateDraftKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProductCreateDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      step: parsed.step === 2 ? 2 : 1,
      sku: String(parsed.sku ?? ""),
      code: String(parsed.code ?? ""),
      barcode: String(parsed.barcode ?? ""),
      size: String(parsed.size ?? ""),
      sizeValue: String(parsed.sizeValue ?? ""),
      sizeUom: String(parsed.sizeUom ?? "g"),
      name: String(parsed.name ?? ""),
      productType:
        parsed.productType === "RAW" ||
        parsed.productType === "FINISHED" ||
        parsed.productType === "BOTH"
          ? parsed.productType
          : "",
      categoryId: String(parsed.categoryId ?? ""),
      productFamily: String(parsed.productFamily ?? ""),
      unit: String(parsed.unit ?? ""),
      defaultTaxCodeId: String(parsed.defaultTaxCodeId ?? ""),
      createPackRows: Array.isArray(parsed.createPackRows)
        ? parsed.createPackRows.map((row) => ({
            uom: String(row?.uom ?? ""),
            unitsPer: String(row?.unitsPer ?? ""),
          }))
        : [],
    };
  } catch {
    return null;
  }
}

export function saveProductCreateDraft(orgId: string, draft: Omit<ProductCreateDraft, "savedAt">): void {
  if (typeof window === "undefined" || !orgId) return;
  try {
    const payload: ProductCreateDraft = {
      ...draft,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(productCreateDraftKey(orgId), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function clearProductCreateDraft(orgId: string): void {
  if (typeof window === "undefined" || !orgId) return;
  try {
    window.localStorage.removeItem(productCreateDraftKey(orgId));
  } catch {
    // ignore
  }
}

/** True when the draft has something worth keeping. */
export function productCreateDraftHasContent(draft: ProductCreateDraft | null | undefined): boolean {
  if (!draft) return false;
  return Boolean(
    draft.name.trim() ||
      draft.barcode.trim() ||
      draft.sku.trim() ||
      draft.code.trim() ||
      draft.size.trim() ||
      draft.sizeValue.trim() ||
      draft.categoryId.trim() ||
      draft.productFamily.trim() ||
      draft.createPackRows.some((r) => r.uom.trim() || r.unitsPer.trim())
  );
}
