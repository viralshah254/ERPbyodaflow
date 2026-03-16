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

export interface ImportPartiesResult {
  imported: number;
  type: string;
}

export interface ImportProductsResult {
  imported: number;
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

/** Import products from CSV file. */
export async function importProductsApi(file: File): Promise<ImportProductsResult> {
  requireLiveApi("Products import");
  const formData = new FormData();
  formData.append("file", file);
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
