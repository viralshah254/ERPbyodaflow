import type { OrgProfileRecord } from "@/lib/data/org-profile.repo";
import { apiRequest, requireLiveApi } from "./client";

type BackendOrg = {
  id: string;
  name: string;
  taxId?: string;
  registrationNumber?: string;
};

export async function fetchOrgProfileApi(): Promise<OrgProfileRecord> {
  requireLiveApi("Organization profile");
  const org = await apiRequest<BackendOrg>("/api/org");
  return {
    name: org.name ?? "",
    taxId: org.taxId ?? "",
    registrationNumber: org.registrationNumber ?? "",
  };
}
