import { apiRequest, isApiConfigured } from "./client";

export type NavCounts = Record<string, number>;

export async function fetchNavCounts(): Promise<NavCounts> {
  if (!isApiConfigured()) return {};
  return apiRequest<NavCounts>("/api/me/nav-counts");
}
