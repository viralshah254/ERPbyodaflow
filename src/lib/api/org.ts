import type { OrgProfileRecord } from "@/lib/data/org-profile.repo";
import { getOrgProfile } from "@/lib/data/org-profile.repo";
import { apiRequest, isApiConfigured } from "./client";

type BackendOrg = {
  id: string;
  name: string;
  taxId?: string;
  registrationNumber?: string;
};

export async function fetchOrgProfileApi(): Promise<OrgProfileRecord> {
  if (!isApiConfigured()) {
    return getOrgProfile();
  }
  const org = await apiRequest<BackendOrg>("/api/org");
  return {
    name: org.name ?? "",
    taxId: org.taxId ?? "",
    registrationNumber: org.registrationNumber ?? "",
  };
}
