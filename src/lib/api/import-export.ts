"use client";

import {
  apiRequest,
  downloadFile,
  fetchApiBinary,
  isApiConfigured,
  requireLiveApi,
  uploadFormData,
} from "./client";

/** Export products as CSV. */
export function exportProductsCsvApi(onError: (msg: string) => void): void {
  requireLiveApi("Products export");
  downloadFile("/api/import/products/export", `products-export-${new Date().toISOString().slice(0, 10)}.csv`, onError);
}

export type PartySheetExportFormat = "xlsx" | "csv";

/** Fetch a CSV API path and save as Excel or CSV. */
async function downloadCsvPathAsFormat(
  path: string,
  stem: string,
  format: PartySheetExportFormat,
  onError: (msg: string) => void
): Promise<boolean> {
  if (format === "csv") {
    return downloadFile(path, `${stem}.csv`, onError);
  }

  try {
    const blob = await fetchApiBinary(path);
    if (!blob) {
      onError("Could not download the file. Try again or use CSV.");
      return false;
    }
    const csvText = await blob.text();
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(csvText, { type: "string" });
    const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const xlsxBlob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(xlsxBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stem}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    onError(e instanceof Error ? e.message : "Excel download failed.");
    return false;
  }
}

/**
 * Download all customers/suppliers for Credit & tax editing.
 * Excel (xlsx) is the default-friendly option for Windows/Mac; CSV suits Google Sheets.
 */
export async function exportPartiesSheetApi(
  type: "customer" | "supplier",
  format: PartySheetExportFormat,
  onError: (msg: string) => void
): Promise<boolean> {
  requireLiveApi("Parties export");
  const date = new Date().toISOString().slice(0, 10);
  const stem = type === "customer" ? `customers-sheet-${date}` : `suppliers-sheet-${date}`;
  return downloadCsvPathAsFormat(
    `/api/import/parties/export?type=${type}`,
    stem,
    format,
    onError
  );
}

/** Export all customers as CSV (open in Google Sheets to edit taxId / credit). */
export function exportCustomersCsvApi(onError: (msg: string) => void): void {
  void exportPartiesSheetApi("customer", "csv", onError);
}

/** Export suppliers as CSV. */
export function exportSuppliersCsvApi(onError: (msg: string) => void): void {
  void exportPartiesSheetApi("supplier", "csv", onError);
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
  void downloadImportTemplateAsFormatApi(entityType, "csv", onError);
}

/** Download import template as Excel or CSV. */
export async function downloadImportTemplateAsFormatApi(
  entityType: ImportTemplateEntity,
  format: PartySheetExportFormat,
  onError: (msg: string) => void
): Promise<boolean> {
  requireLiveApi("Import template");
  return downloadCsvPathAsFormat(
    `/api/import/templates/${entityType}`,
    `${entityType}-import-template`,
    format,
    onError
  );
}

function buildProductsTemplateCsv(opts?: { fmcg?: boolean }): string {
  return opts?.fmcg
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
}

/**
 * Generate and download a products import template client-side.
 * FMCG matches the New Finished SKU form (name, barcode, sku, size, category).
 * Type/base UOM are implied (FINISHED + PCS) and not collected in the file.
 * Seafood keeps CoolCatch samples with explicit type/UOM.
 */
export function downloadProductsTemplateCsv(opts?: { fmcg?: boolean }): void {
  void downloadProductsTemplateAsFormatApi("csv", opts);
}

/** Download products import template as Excel or CSV. */
export async function downloadProductsTemplateAsFormatApi(
  format: PartySheetExportFormat,
  opts?: { fmcg?: boolean }
): Promise<boolean> {
  const csv = buildProductsTemplateCsv(opts);
  const stem = "products-import-template";

  if (format === "csv") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stem}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(csv, { type: "string" });
    const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const xlsxBlob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(xlsxBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stem}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
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
  skipped?: Array<{ row: number; code?: string; reason: string }>;
  warnings?: Array<{ row: number; code?: string; reason: string }>;
}

export interface PatchPartiesResult {
  updated: number;
  unchanged: number;
  type: string;
  skipped?: Array<{ row: number; code?: string; reason: string }>;
}

/**
 * Apply Google Sheets / Excel edits to existing customers (by code).
 * Updates taxId, creditLimitAmount, and other present columns — never creates rows.
 */
export async function patchPartiesFromSheetApi(
  file: File,
  type: "customer" | "supplier"
): Promise<PatchPartiesResult> {
  requireLiveApi("Parties sheet update");
  const uploadFile = await toCsvUploadFile(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("type", type);
  return uploadFormData<PatchPartiesResult>("/api/import/parties/patch", formData);
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

export type ImportProductsProgress = {
  phase: "preparing" | "importing" | "done";
  /** Rows processed so far (0…total). */
  done: number;
  /** Total data rows in the file. */
  total: number;
};

const PRODUCT_IMPORT_BATCH_SIZE = 25;

export interface ImportProductPackagingResult {
  imported: number;
}

export interface ImportProductVariantsResult {
  imported: number;
}

/** Import parties (customers or suppliers) from CSV / Excel file. */
export async function importPartiesApi(file: File, type: "customer" | "supplier"): Promise<ImportPartiesResult> {
  requireLiveApi("Parties import");
  const uploadFile = await toCsvUploadFile(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("type", type);
  return uploadFormData<ImportPartiesResult>("/api/import/parties", formData);
}

/** True for Excel files we transparently convert to CSV before upload. */
function isExcelFile(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name);
}

/**
 * Parse a products CSV into row objects the import API accepts as `body.rows`.
 * Mirrors server header mapping so batched JSON imports behave like a full-file upload.
 */
function parseProductsCsvToRows(csv: string): Array<Record<string, string | number | undefined>> {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith("#");
    });
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || (c === "\t" && !inQuotes)) {
        parts.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    parts.push(current.trim());
    return parts;
  };

  const header = parseLine(lines[0]).map((h) =>
    h.replace(/\s*\((required|optional)\)\s*$/i, "").trim()
  );
  const idx = (re: RegExp) => header.findIndex((h) => re.test(h));
  const nameIdx = idx(/name/i);
  const barcodeIdx = idx(/^\s*(bar[\s_]?code|barcode|ean|upc)\s*$/i);
  const skuIdx = idx(/^sku$/i);
  const sizeIdx = idx(/^\s*(size|pack[\s_]?size)\s*$/i);
  const catIdx = idx(/category|cat/i);
  const vatIdx = idx(/vat/i);
  const codeIdx = (() => {
    const exact = header.findIndex((h) =>
      /^\s*(product[\s_]?code|code|item[\s_]?code)\s*$/i.test(h)
    );
    if (exact >= 0) return exact;
    return header.findIndex((h) => /code/i.test(h) && !/category|brand|bar/i.test(h));
  })();
  const typeIdx = idx(/^(producttype|product type|type|kind)$/i);
  const familyIdx = idx(/^\s*(product[\s_]?family|family|product[\s_]?line)\s*$/i);
  const uomIdx = idx(/uom|unit|baseuom/i);
  const brandIdx = idx(/brand/i);
  const statusIdx = idx(/status/i);
  const grossWIdx = idx(/gross[\s_]?weight/i);
  const grossVIdx = idx(/gross[\s_]?volume/i);
  const cartonIdx = idx(/^\s*cartons?\s*$/i);
  const baleIdx = idx(/^\s*bales?\s*$/i);
  const outerIdx = idx(/^\s*outers?\s*$/i);

  const rows: Array<Record<string, string | number | undefined>> = [];
  for (let i = 1; i < lines.length; i++) {
    const r = parseLine(lines[i]);
    const get = (col: number) => (col >= 0 ? (r[col] ?? "").toString().trim() : "");
    const name = get(nameIdx >= 0 ? nameIdx : 0);
    const barcode = get(barcodeIdx);
    const code = get(codeIdx);
    if (!name && !barcode && !code) continue;
    const gwRaw = get(grossWIdx);
    const gvRaw = get(grossVIdx);
    rows.push({
      __row: i + 1,
      code,
      name: name || get(0),
      sku: get(skuIdx),
      barcode,
      size: get(sizeIdx),
      category: get(catIdx),
      vatCategory: get(vatIdx),
      brandCode: get(brandIdx),
      status: get(statusIdx) || "ACTIVE",
      productType: get(typeIdx),
      productFamily: get(familyIdx),
      uom: get(uomIdx),
      grossWeightKg: gwRaw !== "" ? Number(gwRaw) : undefined,
      grossVolumeM3: gvRaw !== "" ? Number(gvRaw) : undefined,
      carton: get(cartonIdx),
      bale: get(baleIdx),
      outer: get(outerIdx),
    });
  }
  return rows;
}

function mergeImportProductsResults(into: ImportProductsResult, part: ImportProductsResult): void {
  into.imported = (into.imported ?? 0) + (part.imported ?? 0);
  into.created = (into.created ?? 0) + (part.created ?? 0);
  into.updated = (into.updated ?? 0) + (part.updated ?? 0);
  into.skipped = [...(into.skipped ?? []), ...(part.skipped ?? [])];
  into.warnings = [...(into.warnings ?? []), ...(part.warnings ?? [])];
  const cats = new Set([...(into.categoriesCreated ?? []), ...(part.categoriesCreated ?? [])]);
  into.categoriesCreated = [...cats];
}

/**
 * Import products from a CSV or Excel (.xlsx/.xls) file.
 * Excel is parsed in the browser (first sheet) and converted to CSV, so the backend
 * keeps a single CSV code path and no server-side Excel dependency is needed.
 * Large files are sent in batches so the UI can show real progress.
 */
export async function importProductsApi(
  file: File,
  onProgress?: (progress: ImportProductsProgress) => void
): Promise<ImportProductsResult> {
  requireLiveApi("Products import");
  onProgress?.({ phase: "preparing", done: 0, total: 0 });
  const uploadFile = await toCsvUploadFile(file);
  const csv = await uploadFile.text();
  const rows = parseProductsCsvToRows(csv);
  if (!rows.length) {
    throw new Error("No product rows found in the file.");
  }

  const total = rows.length;
  onProgress?.({ phase: "importing", done: 0, total });

  const merged: ImportProductsResult = {
    imported: 0,
    created: 0,
    updated: 0,
    skipped: [],
    warnings: [],
    categoriesCreated: [],
  };

  for (let i = 0; i < rows.length; i += PRODUCT_IMPORT_BATCH_SIZE) {
    const batch = rows.slice(i, i + PRODUCT_IMPORT_BATCH_SIZE);
    const part = await apiRequest<ImportProductsResult>("/api/import/products", {
      method: "POST",
      body: { rows: batch },
    });
    mergeImportProductsResults(merged, part);
    onProgress?.({
      phase: "importing",
      done: Math.min(i + batch.length, total),
      total,
    });
  }

  onProgress?.({ phase: "done", done: total, total });
  return merged;
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
