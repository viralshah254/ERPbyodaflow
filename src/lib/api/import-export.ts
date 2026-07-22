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

/** Download CSV template for import. */
export function downloadImportTemplateApi(
  entityType: "customers" | "suppliers" | "products" | "product-packaging" | "product-variants",
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
        "name,barcode,sku,size,category,carton (optional),bale (optional),outer (optional)",
        "Classic Cola 500ml,6001234567890,COLA-500,500ml,Beverages,24,,",
        "Classic Cola 12x330ml,6001234567891,COLA-12X330,12x330ml,Beverages,12,,",
        "Cooking Oil 2L,6009876543210,OIL-2L,2L,Edible Oils,,,",
      ].join("\n")
    : [
        "code,name,baseUom,productType,category,productFamily",
        "00001,Tilapia Whole,KG,Finished product,Fish,Tilapia",
        "00002,Ice 5kg Bag,EA,Purchased product,Packaging,",
        "00003,Nile Perch Fillet,KG,Stock product,Fish,Nile Perch",
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
  let uploadFile = file;
  if (isExcelFile(file)) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The Excel file has no sheets.");
    }
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
    uploadFile = new File([csv], file.name.replace(/\.(xlsx|xls)$/i, ".csv"), { type: "text/csv" });
  }
  const formData = new FormData();
  formData.append("file", uploadFile);
  return uploadFormData<ImportProductsResult>("/api/import/products", formData);
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
