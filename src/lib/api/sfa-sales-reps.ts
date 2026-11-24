import { apiRequest } from "./client";

/** An OdaFlow SFA team member who sells. `id` is the SFA user id. */
export type SfaSalesRep = { id: string; name: string; phone?: string; tillNumber?: string; roleType?: string; areaName?: string; isActive?: boolean };
export type SfaSalesArea = { areaName: string; regionName: string };
export type NewSfaSalesRep = { name: string; phone: string; email?: string; tillNumber?: string; regionName: string; areaName: string };

export function fetchSfaSalesReps(q = "") {
  return apiRequest<{ reps: SfaSalesRep[]; areas: SfaSalesArea[] }>("/api/joy-dispatch/sales-reps", {
    params: q.trim() ? { q: q.trim() } : {},
  });
}

/** Creates the rep in SFA. An existing SFA rep with the same phone is returned instead. */
export function createSfaSalesRep(input: NewSfaSalesRep) {
  return apiRequest<SfaSalesRep & { reused: boolean }>("/api/joy-dispatch/sales-reps", { method: "POST", body: input });
}
