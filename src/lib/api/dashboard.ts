import { apiRequest } from "./client";
import type {
  ApprovalItem,
  AlertItem,
  RecentDoc,
} from "@/lib/types/dashboard";

export type DashboardWidgets = {
  approvals: ApprovalItem[];
  alerts: AlertItem[];
  recentDocuments: RecentDoc[];
  suggestions: Array<{ id: string; type: string; title: string; description: string; actionUrl: string }>;
};

export async function fetchDashboardWidgets(): Promise<DashboardWidgets> {
  const data = await apiRequest<{
    approvals: Array<Record<string, unknown>>;
    alerts: Array<Record<string, unknown>>;
    recentDocuments: Array<Record<string, unknown>>;
    suggestions: Array<Record<string, unknown>>;
  }>("/api/dashboard/widgets");

  const mapApproval = (a: Record<string, unknown>): ApprovalItem => ({
    id: String(a.id),
    entityType: String(a.entityType ?? a.documentType ?? ""),
    entityId: String(a.entityId ?? a.documentId ?? ""),
    reference: String(a.reference ?? ""),
    summary: String(a.summary ?? ""),
    requestedAt:
      typeof a.requestedAt === "string"
        ? a.requestedAt
        : (a.requestedAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    requestedBy: String(a.requestedBy ?? ""),
    amount: typeof a.amount === "number" ? a.amount : undefined,
    currency: "KES",
    party: a.party != null ? String(a.party) : undefined,
    documentType: a.documentType != null ? String(a.documentType) : undefined,
    documentId: a.documentId != null ? String(a.documentId) : undefined,
  });

  const mapAlert = (a: Record<string, unknown>): AlertItem => ({
    id: String(a.id),
    title: String(a.title ?? ""),
    message: String(a.message ?? ""),
    severity: (a.severity as AlertItem["severity"]) ?? "info",
    createdAt:
      typeof a.createdAt === "string"
        ? a.createdAt
        : (a.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
    suggestedAction: a.suggestedAction != null ? String(a.suggestedAction) : undefined,
  });

  const mapRecentDoc = (d: Record<string, unknown>): RecentDoc => ({
    id: String(d.id),
    type: String(d.type ?? ""),
    number: String(d.number ?? ""),
    party: d.party != null ? String(d.party) : undefined,
    total: typeof d.total === "number" ? d.total : 0,
    status: String(d.status ?? ""),
    updatedAt:
      typeof d.updatedAt === "string"
        ? d.updatedAt
        : (d.updatedAt as Date)?.toISOString?.() ?? new Date().toISOString(),
  });

  const mapSuggestion = (
    s: Record<string, unknown>
  ): { id: string; type: string; title: string; description: string; actionUrl: string } => ({
    id: String(s.id),
    type: String(s.type ?? "OPTIMIZATION"),
    title: String(s.title ?? ""),
    description: String(s.description ?? ""),
    actionUrl: String(s.actionUrl ?? "/dashboard"),
  });

  return {
    approvals: (data.approvals ?? []).map(mapApproval),
    alerts: (data.alerts ?? []).map(mapAlert),
    recentDocuments: (data.recentDocuments ?? []).map(mapRecentDoc),
    suggestions: (data.suggestions ?? []).map(mapSuggestion),
  };
}
