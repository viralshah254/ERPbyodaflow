export const ITEM_ROLES = ["FINISHED", "RAW", "PACKAGING", "SEMI"] as const;

export type ItemRole = (typeof ITEM_ROLES)[number];

export function isItemRole(value: string | null | undefined): value is ItemRole {
  return value === "FINISHED" || value === "RAW" || value === "PACKAGING" || value === "SEMI";
}

export function itemRoleLabel(role: ItemRole): string {
  if (role === "FINISHED") return "Finished goods";
  if (role === "RAW") return "Raw materials";
  if (role === "PACKAGING") return "Packaging";
  return "Semi-finished";
}

export function itemRoleAddLabel(role: ItemRole): string {
  if (role === "FINISHED") return "Add finished good";
  if (role === "RAW") return "Add raw material";
  if (role === "PACKAGING") return "Add packaging";
  return "Add semi-finished";
}

export function itemRoleCreateTitle(role: ItemRole): string {
  if (role === "FINISHED") return "New finished good";
  if (role === "RAW") return "New raw material";
  if (role === "PACKAGING") return "New packaging";
  return "New semi-finished";
}

/** Buy / sell flag set when a plant item is created from a material-type tab. Semi-finished is neither. */
export function productTypeForItemRole(role: ItemRole): "RAW" | "FINISHED" | undefined {
  if (role === "FINISHED") return "FINISHED";
  if (role === "RAW" || role === "PACKAGING") return "RAW";
  return undefined;
}

export function defaultUnitForItemRole(role: ItemRole): string {
  if (role === "RAW" || role === "SEMI") return "KG";
  if (role === "PACKAGING") return "EA";
  return "PCS";
}
