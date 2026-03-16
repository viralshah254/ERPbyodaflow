import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type CrmAccountRow = { id: string; name: string };

export type CrmDealRow = {
  id: string;
  accountId: string;
  name: string;
  stage?: string;
  amount?: number;
  expectedCloseDate?: string;
  ownerId?: string;
};

export type CrmActivityRow = {
  id: string;
  type?: string;
  subject: string;
  accountId?: string;
  dealId?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
  completedAt?: string;
};

export type CrmTicketRow = {
  id: string;
  subject: string;
  accountId?: string;
  status?: string;
  priority?: string;
  description?: string;
};

export type CrmTicketCommentRow = {
  id: string;
  body: string;
  userId: string;
  createdAt: string;
};

export async function fetchCrmAccountsApi(): Promise<CrmAccountRow[]> {
  requireLiveApi("CRM accounts");
  const payload = await apiRequest<{ items: CrmAccountRow[] }>("/api/crm/accounts");
  return payload.items ?? [];
}

export async function fetchCrmDealsApi(): Promise<CrmDealRow[]> {
  requireLiveApi("CRM deals");
  const payload = await apiRequest<{ items: CrmDealRow[] }>("/api/crm/deals");
  return payload.items ?? [];
}

export async function createCrmDealApi(payload: {
  accountId: string;
  name: string;
  stage?: string;
  amount?: number;
  expectedCloseDate?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create CRM deal");
  return apiRequest<{ id: string }>("/api/crm/deals", { method: "POST", body: payload });
}

export async function updateCrmDealApi(id: string, payload: Partial<CrmDealRow>): Promise<CrmDealRow> {
  requireLiveApi("Update CRM deal");
  return apiRequest<CrmDealRow>(`/api/crm/deals/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export async function transitionCrmDealStageApi(id: string, stage: string): Promise<CrmDealRow> {
  requireLiveApi("Deal stage transition");
  return apiRequest<CrmDealRow>(`/api/crm/deals/${encodeURIComponent(id)}/stage-transition`, {
    method: "POST",
    body: { stage },
  });
}

export async function deleteCrmDealApi(id: string): Promise<void> {
  requireLiveApi("Delete CRM deal");
  await apiRequest(`/api/crm/deals/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchCrmActivitiesApi(): Promise<CrmActivityRow[]> {
  requireLiveApi("CRM activities");
  const payload = await apiRequest<{ items: CrmActivityRow[] }>("/api/crm/activities");
  return payload.items ?? [];
}

export async function createCrmActivityApi(payload: {
  type?: string;
  subject: string;
  accountId?: string;
  dealId?: string;
  dueDate?: string;
  status?: string;
  notes?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create CRM activity");
  return apiRequest<{ id: string }>("/api/crm/activities", { method: "POST", body: payload });
}

export async function completeCrmActivityApi(id: string): Promise<CrmActivityRow> {
  requireLiveApi("Complete CRM activity");
  return apiRequest<CrmActivityRow>(`/api/crm/activities/${encodeURIComponent(id)}/complete`, {
    method: "POST",
  });
}

export async function deleteCrmActivityApi(id: string): Promise<void> {
  requireLiveApi("Delete CRM activity");
  await apiRequest(`/api/crm/activities/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function fetchCrmTicketsApi(status?: string): Promise<CrmTicketRow[]> {
  requireLiveApi("CRM tickets");
  const payload = await apiRequest<{ items: CrmTicketRow[] }>("/api/crm/tickets", {
    params: status ? { status } : undefined,
  });
  return payload.items ?? [];
}

export async function createCrmTicketApi(payload: {
  subject: string;
  accountId?: string;
  status?: string;
  priority?: string;
  description?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create CRM ticket");
  return apiRequest<{ id: string }>("/api/crm/tickets", { method: "POST", body: payload });
}

export async function updateCrmTicketApi(id: string, payload: Partial<CrmTicketRow>): Promise<CrmTicketRow> {
  requireLiveApi("Update CRM ticket");
  return apiRequest<CrmTicketRow>(`/api/crm/tickets/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export async function addCrmTicketCommentApi(id: string, body: string): Promise<{ id: string }> {
  requireLiveApi("Add CRM ticket comment");
  return apiRequest<{ id: string }>(`/api/crm/tickets/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: { body },
  });
}

export async function fetchCrmTicketHistoryApi(
  id: string
): Promise<{ ticket: CrmTicketRow; comments: CrmTicketCommentRow[] }> {
  requireLiveApi("CRM ticket history");
  return apiRequest<{ ticket: CrmTicketRow; comments: CrmTicketCommentRow[] }>(
    `/api/crm/tickets/${encodeURIComponent(id)}/history`
  );
}

export async function deleteCrmTicketApi(id: string): Promise<void> {
  requireLiveApi("Delete CRM ticket");
  await apiRequest(`/api/crm/tickets/${encodeURIComponent(id)}`, { method: "DELETE" });
}
