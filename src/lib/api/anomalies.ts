import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AnomalyDetection } from "@/types/erp";

type BackendAnomaly = {
  id: string;
  type: AnomalyDetection["type"];
  severity: AnomalyDetection["severity"];
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  investigateLink?: string;
  createdAt?: string;
  acknowledgedAt?: string;
};

function mapAnomaly(item: BackendAnomaly): AnomalyDetection {
  return {
    anomalyId: item.id,
    orgId: "",
    type: item.type,
    severity: item.severity,
    title: item.title,
    description: item.description,
    detectedAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    resolvedAt: item.acknowledgedAt ? new Date(item.acknowledgedAt) : undefined,
    metadata: {
      entityType: item.entityType,
      entityId: item.entityId,
      investigateLink: item.investigateLink,
    },
  };
}

export async function fetchAnomaliesApi(params?: {
  type?: AnomalyDetection["type"];
  severity?: AnomalyDetection["severity"];
}): Promise<AnomalyDetection[]> {
  requireLiveApi("Analytics anomalies");
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.severity) query.set("severity", params.severity);
  const payload = await apiRequest<{ items: BackendAnomaly[] }>("/api/analytics/anomalies", {
    params: query,
  });
  return (payload.items ?? []).map(mapAnomaly);
}
