import { apiRequest, requireLiveApi } from "./client";

export type TeamRow = {
  id: string;
  name: string;
  description?: string;
  branchId?: string;
  leadUserId?: string;
  memberUserIds: string[];
};

export type TeamInput = Omit<TeamRow, "id">;

export async function fetchTeamsApi(): Promise<TeamRow[]> {
  const res = await apiRequest<{ items: TeamRow[] }>("/api/settings/teams");
  return res.items ?? [];
}

export async function createTeamApi(body: TeamInput): Promise<{ id: string }> {
  requireLiveApi("Teams");
  return apiRequest("/api/settings/teams", { method: "POST", body });
}

export async function updateTeamApi(id: string, body: Partial<TeamInput>): Promise<{ id: string }> {
  requireLiveApi("Teams");
  return apiRequest(`/api/settings/teams/${encodeURIComponent(id)}`, { method: "PATCH", body: { ...body, branchId: body.branchId ?? "", leadUserId: body.leadUserId ?? "" } });
}

export async function archiveTeamApi(id: string): Promise<void> {
  requireLiveApi("Teams");
  await apiRequest(`/api/settings/teams/${encodeURIComponent(id)}`, { method: "DELETE" });
}
