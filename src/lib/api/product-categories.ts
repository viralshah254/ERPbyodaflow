import { apiRequest, requireLiveApi } from "./client";

/**
 * Letters, digits, hyphen, underscore — e.g. BEV-01, SORA_2.
 * Pass `trimEnds: true` on save so leading/trailing `-`/`_` are removed.
 */
export function normalizeCategoryCode(
  raw: string,
  maxLen = 32,
  options?: { trimEnds?: boolean }
): string {
  let value = raw
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "")
    .slice(0, maxLen);
  // Default: keep ends while typing. Trim on save via trimEnds: true.
  if (options?.trimEnds) {
    value = value.replace(/^[-_]+|[-_]+$/g, "");
  }
  return value;
}

export function suggestCategoryCodeFromName(name: string, existingCodes: string[]): string {
  const base = normalizeCategoryCode(name.replace(/\s+/g, "-"), 12) || "CAT";
  const used = new Set(existingCodes.map((c) => c.toUpperCase()));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`) && n < 100) n += 1;
  return `${base}-${n}`;
}

export interface ItemCategoryRow {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  departmentId?: string;
  isActive: boolean;
}

export async function fetchProductCategoriesApi(): Promise<ItemCategoryRow[]> {
  requireLiveApi("Product categories");
  const payload = await apiRequest<{ items: ItemCategoryRow[] }>(
    "/api/master-data/product/item-categories"
  );
  return payload.items ?? [];
}

export async function createProductCategoryApi(payload: {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}): Promise<{ id: string }> {
  requireLiveApi("Create product category");
  return apiRequest<{ id: string }>(
    "/api/master-data/product/item-categories",
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function updateProductCategoryApi(
  id: string,
  payload: { name?: string; code?: string; description?: string; isActive?: boolean }
): Promise<ItemCategoryRow> {
  requireLiveApi("Update product category");
  return apiRequest<ItemCategoryRow>(
    `/api/master-data/product/item-categories/${id}`,
    { method: "PATCH", body: payload }
  );
}

export async function deleteProductCategoryApi(
  id: string
): Promise<{ ok: boolean; detachedProducts: number }> {
  requireLiveApi("Delete product category");
  return apiRequest<{ ok: boolean; detachedProducts: number }>(
    `/api/master-data/product/item-categories/${id}`,
    { method: "DELETE" }
  );
}
