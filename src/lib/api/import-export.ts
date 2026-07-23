"use client";

import { downloadFile, isApiConfigured, requireLiveApi, uploadFormData } from "./client";

/** Export products as CSV. */
export function exportProductsCsvApi(onError: (msg: string) => void): void {
  requireLiveApi("Products export");
  downloadFile("/api/import/products/export", `products-export-${new Date().toISOString().slice(0, 10)}.csv`, onError);
}

/** Export customers as CSV. */
export function exportCustomersCsvApi(onError: (msg: string) => void): void {
  requireLiveApi("Customers export");
  downloadFile("/api/import/parties/export?type=customer", `customers-export-${new Date().toISOString().slice(0, 10)}.csv`, onError);
}

/** Export suppliers as CSV. */
export function exportSuppliersCsvApi(onError: (msg: string) => void): void {
  requireLiveApi("Suppliers export");
  downloadFile("/api/import/parties/export?type=supplier", `suppliers-export-${new Date().toISOString().slice(0, 10)}.csv`, onError);
}

/** Export product packaging as CSV. */
export function exportProductPackagingCsvApi(onError: (msg: string) => void): void {
  requireLiveApi("Product packaging export");
  downloadFile("/api/import/product-packaging/export", `product-packaging-export-${new Date().toISOString().slice(0, 10)}.csv`, onError);
}

/** Export product variants as CSV. */
export function exportProductVariantsCsvApi(onError: (msg: string) => void): void {
  requireLiveApi("Product variants export");
  downloadFile("/api/import/product-variants/export", `product-variants-export-${new Date().toISOString().slice(0, 10)}.csv`, onError);
}

export type ImportTemplateEntity =
  | "customers"
  | "suppliers"
  | "products"
  | "product-packaging"
  | "product-variants"
  | "price-lists"
  | "opening-stock"
  | "ar-opening-balances";

/** Download CSV template for import. */
export function downloadImportTemplateApi(
  entityType: ImportTemplateEntity,
  onError: (msg: string) => void
): void {
  requireLiveApi("Import template");
  downloadFile(`/api/import/templates/${entityType}`, `${entityType}-import-template.csv`, onError);
}

/**
 * Generate and download a products import template client-side.
 * FMCG matches the New Finished SKU form (name, barcode, sku, size, category).
 * Type/base UOM are implied (FINISHED + PCS) and not collected in the file.
 * Seafood keeps CoolCatch samples with explicit type/UOM.
 */
export function downloadProductsTemplateCsv(opts?: { fmcg?: boolean }): void {
  const csv = opts?.fmcg
    ? [
        "name,barcode,sku,size,category,vatCategory,grossWeightKg,grossVolumeM3,carton (optional),bale (optional),outer (optional)",
        "Classic Cola 500ml,6001234567890,COLA-500,500ml,Beverages,standard,0.55,0.0012,24,,",
        "Classic Cola 12x330ml,6001234567891,COLA-12X330,12x330ml,Beverages,standard,4.2,0.008,12,,",
        "Cooking Oil 2L,6009876543210,OIL-2L,2L,Edible Oils,zero,2.1,0.0025,,,",
      ].join("\n")
    : [
        "code,name,baseUom,productType,category,productFamily,vatCategory,grossWeightKg,grossVolumeM3",
        "00001,Tilapia Whole,KG,Finished product,Fish,Tilapia,standard,,",
        "00002,Ice 5kg Bag,EA,Purchased product,Packaging,,zero,,",
        "00003,Nile Perch Fillet,KG,Stock product,Fish,Nile Perch,export,,",
      ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function toCsvUploadFile(file: File): Promise<File> {
  if (!isExcelFile(file)) return file;
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("The Excel file has no sheets.");
  const csv = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
  return new File([csv], file.name.replace(/\.(xlsx|xls)$/i, ".csv"), { type: "text/csv" });
}

export interface ImportPartiesResult {
  imported: number;
  type: string;
}

export interface ImportRowIssue {
  row: number;
  code: string;
  reason: string;
}

export interface ImportProductsResult {
  imported: number;
  created?: number;
  updated?: number;
  skipped?: ImportRowIssue[];
  warnings?: ImportRowIssue[];
  /** Names of categories auto-created from the file during import. */
  categoriesCreated?: string[];
}

export interface ImportProductPackagingResult {
  imported: number;
}

export interface ImportProductVariantsResult {
  imported: number;
}

/** Import parties (customers or suppliers) from CSV file. */
export async function importPartiesApi(file: File, type: "customer" | "supplier"): Promise<ImportPartiesResult> {
  requireLiveApi("Parties import");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  return uploadFormData<ImportPartiesResult>("/api/import/parties", formData);
}

/** True for Excel files we transparently convert to CSV before upload. */
function isExcelFile(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name);
}

/**
 * Import products from a CSV or Excel (.xlsx/.xls) file.
 * Excel is parsed in the browser (first sheet) and converted to CSV, so the backend
 * keeps a single CSV code path and no server-side Excel dependency is needed.
 */
export async function importProductsApi(file: File): Promise<ImportProductsResult> {
  requireLiveApi("Products import");
  const uploadFile = await toCsvUploadFile(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  return uploadFormData<ImportProductsResult>("/api/import/products", formData);
}

export interface ImportPriceListsResult {
  tagsCreated: number;
  tagsUpdated: number;
  pricesUpserted: number;
  skipped?: Array<{ row: number; reason: string }>;
}

export interface ImportOpeningStockResult {
  imported: number;
  adjustmentId?: string;
  adjustmentNumber?: string;
  skipped?: Array<{ row: number; reason: string }>;
}

export interface ImportArOpeningBalancesResult {
  imported: number;
  skipped?: Array<{ row: number; reason: string }>;
}

/** Bulk create/fill price tags from CSV (priceTag, sku/barcode, price). */
export async function importPriceListsApi(file: File): Promise<ImportPriceListsResult> {
  requireLiveApi("Price tags import");
  const uploadFile = await toCsvUploadFile(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  return uploadFormData<ImportPriceListsResult>("/api/import/price-lists", formData);
}

/** Opening stock quantities (sku/barcode, warehouse, quantity). */
export async function importOpeningStockApi(file: File): Promise<ImportOpeningStockResult> {
  requireLiveApi("Opening stock import");
  const uploadFile = await toCsvUploadFile(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  return uploadFormData<ImportOpeningStockResult>("/api/import/opening-stock", formData);
}

/** Customer AR opening balances (transfer balances). */
export async function importArOpeningBalancesApi(file: File): Promise<ImportArOpeningBalancesResult> {
  requireLiveApi("AR opening balances import");
  const uploadFile = await toCsvUploadFile(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  return uploadFormData<ImportArOpeningBalancesResult>("/api/import/ar-opening-balances", formData);
}

/** Import product packaging from CSV file. */
export async function importProductPackagingApi(file: File): Promise<ImportProductPackagingResult> {
  requireLiveApi("Product packaging import");
  const formData = new FormData();
  formData.append("file", file);
  return uploadFormData<ImportProductPackagingResult>("/api/import/product-packaging", formData);
}

/** Import product variants from CSV file. */
export async function importProductVariantsApi(file: File): Promise<ImportProductVariantsResult> {
  requireLiveApi("Product variants import");
  const formData = new FormData();
  formData.append("file", file);
  return uploadFormData<ImportProductVariantsResult>("/api/import/product-variants", formData);
}

export function isImportExportAvailable(): boolean {
  return isApiConfigured();
}
