/** Prefer a store name. Fall back to the store code inside an internal warehouse id. */
export function storeDisplayName(
  warehouseId?: string | null,
  warehouseName?: string | null,
  known?: Record<string, string>,
): string {
  const id = warehouseId?.trim() ?? "";
  const knownName = id ? known?.[id]?.trim() : "";
  const name = (knownName || warehouseName || "").trim();
  if (name && name !== id && !name.includes(":wh:")) return name;
  const code = id.includes(":wh:") ? id.split(":wh:").pop()?.trim() : "";
  return code || (name && !name.includes(":wh:") ? name : "") || "Store";
}
