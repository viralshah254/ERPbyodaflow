import { apiRequest, downloadFile, requireLiveApi } from "@/lib/api/client";

export type AuditLogEntry = {
  id?: string;
  when: string;
  who?: string;
  what?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  before?: unknown;
  after?: unknown;
};

type BackendAuditLogEntry = {
  _id?: string;
  when: string;
  who?: string;
  what?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  before?: unknown;
  after?: unknown;
};

function mapAuditEntry(entry: BackendAuditLogEntry): AuditLogEntry {
  return {
    id: entry._id,
    when: entry.when,
    who: entry.who,
    what: entry.what,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    before: entry.before,
    after: entry.after,
  };
}

export async function fetchAuditLogApi(limit = 200): Promise<AuditLogEntry[]> {
  requireLiveApi("Audit log");
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  const payload = await apiRequest<{ entries: BackendAuditLogEntry[] }>("/api/audit/log", { params });
  return (payload.entries ?? []).map(mapAuditEntry);
}

export async function fetchAuditLogs(params: { sourceType: string; sourceId: string; limit?: number }): Promise<AuditLogEntry[]> {
  requireLiveApi("Audit logs by entity");
  const query = new URLSearchParams();
  query.set("entityType", params.sourceType);
  query.set("entityId", params.sourceId);
  if (params.limit) query.set("limit", String(params.limit));
  try {
    const payload = await apiRequest<{ entries: BackendAuditLogEntry[] }>(`/api/audit/entity`, { params: Object.fromEntries(query) });
    return (payload.entries ?? []).map(mapAuditEntry);
  } catch {
    return [];
  }
}

export async function exportAuditLogApi(): Promise<void> {
  requireLiveApi("Audit log export");
  await downloadFile("/api/audit/export?format=csv", "audit-export.csv", () => undefined);
}
