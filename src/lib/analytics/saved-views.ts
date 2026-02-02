/**
 * Saved analysis views — metric + dimensions + filters.
 * localStorage; shareable link = stub.
 */

import type { AnalyticsQuery, AnalyticsGlobalFilters } from "./types";

const STORAGE_KEY = "odaflow_analytics_saved_views";

export interface SavedAnalysisView {
  id: string;
  name: string;
  query: AnalyticsQuery;
  filters?: AnalyticsGlobalFilters;
  createdAt: string;
}

export function getSavedAnalysisViews(): SavedAnalysisView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAnalysisView(
  name: string,
  query: AnalyticsQuery,
  filters?: AnalyticsGlobalFilters
): SavedAnalysisView {
  const views = getSavedAnalysisViews();
  const view: SavedAnalysisView = {
    id: `av-${Date.now()}`,
    name,
    query,
    filters,
    createdAt: new Date().toISOString(),
  };
  views.unshift(view);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  return view;
}

export function deleteAnalysisView(id: string): void {
  const views = getSavedAnalysisViews().filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function getShareableLink(_view: SavedAnalysisView): string {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/analytics/explore?view=stub`;
}
