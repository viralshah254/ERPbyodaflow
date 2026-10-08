import { apiRequest, requireLiveApi } from "./client";

export type GoLiveKeepGroup = "protected" | "master" | "operational";

export type GoLiveKeepOption = {
  id: string;
  label: string;
  description: string;
  group: GoLiveKeepGroup;
  locked: boolean;
  defaultKeep: boolean;
  disclaimer?: string;
  includes: string[];
  count: number;
};

export type EnvironmentStatus = {
  environmentMode: "SANDBOX" | "LIVE";
  sandboxSeededAt: string | null;
  wentLiveAt: string | null;
  canLoadDummy: boolean;
  dummyLoaded: boolean;
  orgName: string;
  keepOptions: GoLiveKeepOption[];
  defaultKeepCategoryIds: string[];
  preview: {
    documents: number;
    stockLevels: number;
    payments: number;
    seededProducts: number;
    seededParties: number;
    seededPriceLists: number;
  };
};

export async function fetchEnvironmentStatusApi(): Promise<EnvironmentStatus> {
  requireLiveApi("Environment");
  return apiRequest<EnvironmentStatus>("/api/settings/environment");
}

export async function seedSandboxDummyApi(): Promise<EnvironmentStatus> {
  requireLiveApi("Load sandbox dummy data");
  return apiRequest<EnvironmentStatus>("/api/settings/environment/seed-dummy", {
    method: "POST",
    body: {},
  });
}

export async function goLiveApi(
  confirmName: string,
  keepCategoryIds: string[]
): Promise<EnvironmentStatus> {
  requireLiveApi("Go Live");
  return apiRequest<EnvironmentStatus>("/api/settings/environment/go-live", {
    method: "POST",
    body: { confirmName, keepCategoryIds },
  });
}

export async function enterSandboxApi(confirmName: string): Promise<EnvironmentStatus> {
  requireLiveApi("Move to Sandbox");
  return apiRequest<EnvironmentStatus>("/api/settings/environment/enter-sandbox", {
    method: "POST",
    body: { confirmName },
  });
}
