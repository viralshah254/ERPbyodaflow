import { apiRequest, requireLiveApi } from "./client";

export type Preferences = {
  theme?: string;
  locale?: string;
  dateFormat?: string;
  currency?: string;
  timeZone?: string;
};

const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  locale: "en",
  dateFormat: "YYYY-MM-DD",
  currency: "KES",
  timeZone: "Africa/Nairobi",
};

export async function fetchPreferencesApi(): Promise<Preferences> {
  requireLiveApi("Preferences");
  const data = await apiRequest<Partial<Preferences>>("/api/settings/preferences");
  return { ...DEFAULT_PREFERENCES, ...data };
}

export async function updatePreferencesApi(patch: Partial<Preferences>): Promise<Preferences> {
  requireLiveApi("Update preferences");
  const data = await apiRequest<Partial<Preferences>>("/api/settings/preferences", {
    method: "PATCH",
    body: patch,
  });
  return { ...DEFAULT_PREFERENCES, ...data };
}
