/**
 * Persist sidebar section and item expand/collapse state in localStorage.
 * Keys: erp_sidebar_sections, erp_sidebar_items
 */

const SECTIONS_KEY = "erp_sidebar_sections";
const ITEMS_KEY = "erp_sidebar_items";

function getStored(key: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function setStored(key: string, data: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getSectionExpanded(sectionId: string): boolean | undefined {
  return getStored(SECTIONS_KEY)[sectionId];
}

export function setSectionExpanded(sectionId: string, expanded: boolean): void {
  const next = { ...getStored(SECTIONS_KEY), [sectionId]: expanded };
  setStored(SECTIONS_KEY, next);
}

export function getItemExpanded(itemId: string): boolean | undefined {
  return getStored(ITEMS_KEY)[itemId];
}

export function setItemExpanded(itemId: string, expanded: boolean): void {
  const next = { ...getStored(ITEMS_KEY), [itemId]: expanded };
  setStored(ITEMS_KEY, next);
}
