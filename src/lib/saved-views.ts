/**
 * localStorage helpers for saved views (e.g. per doc type, per user).
 * Key: odaflow_saved_views_${scope} — scope = doc type or "products" | "parties" etc.
 */

import type { SavedView } from "@/components/ui/saved-views-dropdown";

const PREFIX = "odaflow_saved_views_";

export function getSavedViews(scope: string): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PREFIX + scope);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveView(scope: string, view: Omit<SavedView, "id">): SavedView {
  const list = getSavedViews(scope);
  const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const v: SavedView = { ...view, id };
  list.push(v);
  try {
    localStorage.setItem(PREFIX + scope, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return v;
}

export function deleteSavedView(scope: string, viewId: string): void {
  const list = getSavedViews(scope).filter((x) => x.id !== viewId);
  try {
    localStorage.setItem(PREFIX + scope, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function updateSavedView(
  scope: string,
  viewId: string,
  patch: Partial<Omit<SavedView, "id">>
): SavedView | null {
  const list = getSavedViews(scope);
  const i = list.findIndex((x) => x.id === viewId);
  if (i < 0) return null;
  list[i] = { ...list[i]!, ...patch };
  try {
    localStorage.setItem(PREFIX + scope, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list[i]!;
}
