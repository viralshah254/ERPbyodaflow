import { apiRequest } from "./client";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

export type ResolvedLocation = {
  formattedAddress: string;
  line1?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
};

export async function autocompletePlacesApi(
  input: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ input });
  if (sessionToken) params.set("sessionToken", sessionToken);
  const data = await apiRequest<{ items: PlaceSuggestion[] }>("/api/places/autocomplete", { params });
  return data.items ?? [];
}

export async function resolvePlaceDetailsApi(
  placeId: string,
  sessionToken?: string,
): Promise<ResolvedLocation> {
  const params = new URLSearchParams({ placeId });
  if (sessionToken) params.set("sessionToken", sessionToken);
  return apiRequest<ResolvedLocation>("/api/places/details", { params });
}

export async function reverseGeocodeApi(lat: number, lng: number): Promise<ResolvedLocation> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return apiRequest<ResolvedLocation>("/api/places/reverse-geocode", { params });
}
