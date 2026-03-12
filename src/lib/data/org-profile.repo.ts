import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

export interface OrgProfileRecord {
  name: string;
  taxId: string;
  registrationNumber: string;
}

const KEY = "odaflow_org_profile";

function seedOrgProfile(): OrgProfileRecord {
  return {
    name: "Acme Manufacturing",
    taxId: "",
    registrationNumber: "",
  };
}

export function getOrgProfile(): OrgProfileRecord {
  return loadStoredValue(KEY, seedOrgProfile);
}

export function saveOrgProfile(profile: OrgProfileRecord): void {
  saveStoredValue(KEY, profile);
}

