import type { AssetRow, DepreciationMethod } from "@/lib/types/assets";

export const ASSET_CATEGORIES = ["IT Equipment", "Machinery", "Furniture", "Vehicles", "Other"] as const;

const VEHICLES_CATEGORY = "Vehicles";

/** Annual reducing-balance rates: motor vehicles 25%; equipment & everything else 10%. */
export function defaultAnnualDepreciationRatePct(category: string): number {
  return category === VEHICLES_CATEGORY ? 25 : 10;
}

export function suggestNextFaCode(rows: AssetRow[]): string {
  let max = 0;
  for (const r of rows) {
    const m = /^FA-(\d+)$/i.exec(String(r.code).trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `FA-${String(max + 1).padStart(3, "0")}`;
}

export type AssetForm = {
  code: string;
  name: string;
  category: string;
  branchId: string;
  serialNumber: string;
  assetTag: string;
  model: string;
  inServiceDate: string;
  acquisitionDate: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  usefulLifeMonths: string;
  depreciationMethod: DepreciationMethod;
  depreciationRatePct: string;
  linkedVendorId: string;
  linkedInvoiceId: string;
};

export function emptyAssetForm(): AssetForm {
  const defaultCat = ASSET_CATEGORIES[0] ?? "Other";
  return {
    code: "",
    name: "",
    category: defaultCat,
    branchId: "",
    serialNumber: "",
    assetTag: "",
    model: "",
    inServiceDate: "",
    acquisitionDate: new Date().toISOString().slice(0, 10),
    cost: 0,
    salvage: 0,
    usefulLifeYears: 3,
    usefulLifeMonths: "",
    depreciationMethod: "REDUCING_BALANCE",
    depreciationRatePct: String(defaultAnnualDepreciationRatePct(defaultCat)),
    linkedVendorId: "",
    linkedInvoiceId: "",
  };
}

export function assetFormFromRow(r: AssetRow): AssetForm {
  return {
    code: r.code,
    name: r.name,
    category: r.category,
    branchId: r.branchId ?? "",
    serialNumber: r.serialNumber ?? "",
    assetTag: r.assetTag ?? "",
    model: r.model ?? "",
    inServiceDate: r.inServiceDate ?? "",
    acquisitionDate: r.acquisitionDate,
    cost: r.cost,
    salvage: r.salvage,
    usefulLifeYears: r.usefulLifeYears,
    usefulLifeMonths: r.usefulLifeMonths != null ? String(r.usefulLifeMonths) : "",
    depreciationMethod: r.depreciationMethod,
    depreciationRatePct: r.depreciationRatePct != null ? String(r.depreciationRatePct) : "",
    linkedVendorId: r.linkedVendorId ?? "",
    linkedInvoiceId: r.linkedInvoiceId ?? "",
  };
}

export function parseOptionalInt(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? Math.round(n) : undefined;
}

export function parseOptionalRate(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
}
