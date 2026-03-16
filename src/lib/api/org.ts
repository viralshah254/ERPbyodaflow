import type { OrgProfileRecord } from "@/lib/types/org";
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

export async function saveOrgProfileApi(payload: {
  name?: string;
  taxId?: string;
  registrationNumber?: string;
}): Promise<void> {
  requireLiveApi("Organization profile save");
  await apiRequest("/api/org", {
    method: "PATCH",
    body: payload,
  });
}
