import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { ProjectRow, ProjectStatus } from "@/lib/types/projects";

type BackendProject = {
  id: string;
  code?: string;
  name: string;
  status?: string;
  client?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  costCenterCode?: string;
  costCenterName?: string;
  timesheetCostingMode?: "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
  defaultHourlyRate?: number;
  createdAt?: string;
};

type BackendTimesheet = {
  id: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
};

type BackendProjectCostLink = {
  id: string;
  kind: "TIMESHEET" | "DOCUMENT";
  date: string;
  number: string;
  description?: string;
  amount: number;
  quantity?: number;
  rate?: number;
  unit: "HOURS" | "AMOUNT";
  currency: string;
  status: string;
  drillPath?: string;
  sourceId: string;
  sourceType?: string;
  journalId?: string;
  rateSource?: "EMPLOYEE_OVERRIDE_RATE" | "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
};

type BackendProjectCostingResponse = {
  summary: {
    timesheetHours: number;
    timesheetAmount: number;
    documentAmount: number;
    totalBurn: number;
    budget: number;
    burnPct: number;
    timesheetCostingMode: "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
    defaultHourlyRate: number;
    postedDocumentCount: number;
  };
  items: BackendProjectCostLink[];
};

type BackendLinkableDocument = {
  id: string;
  number: string;
  date: string;
  typeKey: string;
  total: number;
  currency: string;
  status: string;
};

export type ProjectTimesheetRow = {
  id: string;
  userId: string;
  date: string;
  hours: number;
  description?: string;
};

export type ProjectCostLinkRow = {
  id: string;
  kind: "TIMESHEET" | "DOCUMENT";
  date: string;
  number: string;
  description?: string;
  amount: number;
  quantity?: number;
  rate?: number;
  unit: "HOURS" | "AMOUNT";
  currency: string;
  status: string;
  drillPath?: string;
  sourceId: string;
  sourceType?: string;
  journalId?: string;
  rateSource?: "EMPLOYEE_OVERRIDE_RATE" | "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
};

export type ProjectCostingSummary = {
  timesheetHours: number;
  timesheetAmount: number;
  documentAmount: number;
  totalBurn: number;
  budget: number;
  burnPct: number;
  timesheetCostingMode: "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
  defaultHourlyRate: number;
  postedDocumentCount: number;
};

export type LinkableProjectDocument = {
  id: string;
  number: string;
  date: string;
  typeKey: string;
  total: number;
  currency: string;
  status: string;
};

export type CreateProjectInput = {
  code?: string;
  name: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  budget?: number;
  costCenterCode?: string;
  costCenterName?: string;
  timesheetCostingMode?: "EMPLOYEE_SALARY_MONTHLY_173" | "PROJECT_DEFAULT_RATE";
  defaultHourlyRate?: number;
};

function toProjectRow(project: BackendProject): ProjectRow {
  const startDate = project.startDate?.slice(0, 10) ?? project.createdAt?.slice(0, 10) ?? "";
  return {
    id: project.id,
    code: project.code ?? project.id.slice(0, 8).toUpperCase(),
    name: project.name,
    client: project.client ?? "Internal",
    clientId: project.clientId,
    startDate,
    endDate: project.endDate?.slice(0, 10) ?? startDate,
    status: (project.status as ProjectStatus) ?? "ACTIVE",
    budget: project.budget ?? 0,
    costCenterCode: project.costCenterCode,
    costCenterName: project.costCenterName,
    timesheetCostingMode: project.timesheetCostingMode,
    defaultHourlyRate: project.defaultHourlyRate,
  };
}

export async function fetchProjectsApi(): Promise<ProjectRow[]> {
  requireLiveApi("Projects");
  const payload = await apiRequest<{ items: BackendProject[] }>("/api/projects");
  return (payload.items ?? []).map(toProjectRow);
}

export async function fetchProjectByIdApi(id: string): Promise<ProjectRow | null> {
  requireLiveApi("Project detail");
  try {
    const payload = await apiRequest<BackendProject>(`/api/projects/${encodeURIComponent(id)}`);
    return toProjectRow(payload);
  } catch {
    return null;
  }
}

export async function createProjectApi(payload: CreateProjectInput): Promise<{ id: string }> {
  requireLiveApi("Create project");
  return apiRequest<{ id: string }>("/api/projects", {
    method: "POST",
    body: payload,
  });
}

export async function fetchProjectTimesheetsApi(projectId: string): Promise<ProjectTimesheetRow[]> {
  requireLiveApi("Project activity");
  const params = new URLSearchParams();
  params.set("projectId", projectId);
  const payload = await apiRequest<{ items: BackendTimesheet[] }>("/api/timesheets", { params });
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    userId: item.userId,
    date: item.date.slice(0, 10),
    hours: item.hours ?? 0,
    description: item.description,
  }));
}

export async function fetchProjectCostingLinksApi(projectId: string): Promise<{
  summary: ProjectCostingSummary;
  items: ProjectCostLinkRow[];
}> {
  requireLiveApi("Project costing links");
  const payload = await apiRequest<BackendProjectCostingResponse>(`/api/projects/${encodeURIComponent(projectId)}/costing-links`);
  return {
    summary: payload.summary,
    items: payload.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      date: item.date.slice(0, 10),
      number: item.number,
      description: item.description,
      amount: item.amount ?? 0,
      quantity: item.quantity,
      rate: item.rate,
      unit: item.unit,
      currency: item.currency,
      status: item.status,
      drillPath: item.drillPath,
      sourceId: item.sourceId,
      sourceType: item.sourceType,
      journalId: item.journalId,
      rateSource: item.rateSource,
    })),
  };
}

export async function fetchProjectLinkableDocumentsApi(
  projectId: string,
  search?: string
): Promise<LinkableProjectDocument[]> {
  requireLiveApi("Project linkable documents");
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const payload = await apiRequest<{ items: BackendLinkableDocument[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/linkable-documents`,
    { params }
  );
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    number: item.number,
    date: item.date.slice(0, 10),
    typeKey: item.typeKey,
    total: item.total ?? 0,
    currency: item.currency ?? "KES",
    status: item.status,
  }));
}

export async function linkDocumentToProjectApi(projectId: string, documentId: string): Promise<void> {
  requireLiveApi("Link project document");
  await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/costing-links/documents`, {
    method: "POST",
    body: { documentId },
  });
}
