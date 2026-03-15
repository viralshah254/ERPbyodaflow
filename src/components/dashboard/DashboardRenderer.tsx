"use client";

import * as React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import {
  MOCK_KPIS,
  MOCK_APPROVALS,
  MOCK_TASKS,
  MOCK_ALERTS,
  MOCK_SUGGESTIONS,
  MOCK_RECENT_DOCS,
} from "@/lib/mock/dashboard";
import { fetchDashboardWidgets } from "@/lib/api/dashboard";
import { isApiConfigured } from "@/lib/api/client";
import { DashboardKpiCard } from "./cards/DashboardKpiCard";
import { MyApprovalsCard } from "./cards/MyApprovalsCard";
import { MyTasksCard } from "./cards/MyTasksCard";
import { AlertsCard } from "./cards/AlertsCard";
import { CopilotSuggestionsCard } from "./cards/CopilotSuggestionsCard";
import { RecentDocumentsCard } from "./cards/RecentDocumentsCard";
import { SetupChecklistCard } from "./SetupChecklistCard";

const ADMIN_KPI_IDS = [
  "production-overview",
  "inventory-levels",
  "pending-work-orders",
  "recent-grn",
];

function getKpiIdsForRole(
  roleId: string | undefined,
  defaultRoleDashboards: { roleId: string; widgetIds: string[] }[]
): string[] {
  const found = defaultRoleDashboards.find((r) => r.roleId === roleId);
  if (found) {
    return found.widgetIds.filter((id) => MOCK_KPIS[id]);
  }
  return ADMIN_KPI_IDS;
}

export function DashboardRenderer() {
  const user = useAuthStore((s) => s.user);
  const { template, defaultRoleDashboards } = useOrgContextStore();
  const [widgets, setWidgets] = React.useState<{
    approvals: typeof MOCK_APPROVALS;
    alerts: typeof MOCK_ALERTS;
    suggestions: typeof MOCK_SUGGESTIONS;
    recentDocuments: typeof MOCK_RECENT_DOCS;
  } | null>(null);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setWidgets({
        approvals: MOCK_APPROVALS,
        alerts: MOCK_ALERTS,
        suggestions: MOCK_SUGGESTIONS,
        recentDocuments: MOCK_RECENT_DOCS,
      });
      return;
    }
    let cancelled = false;
    fetchDashboardWidgets()
      .then((data) => {
        if (!cancelled) {
          setWidgets({
            approvals: data.approvals.length > 0 ? data.approvals : MOCK_APPROVALS,
            alerts: data.alerts.length > 0 ? data.alerts : MOCK_ALERTS,
            suggestions:
              data.suggestions.length > 0
                ? (data.suggestions as typeof MOCK_SUGGESTIONS)
                : MOCK_SUGGESTIONS,
            recentDocuments:
              data.recentDocuments.length > 0 ? data.recentDocuments : MOCK_RECENT_DOCS,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWidgets({
            approvals: MOCK_APPROVALS,
            alerts: MOCK_ALERTS,
            suggestions: MOCK_SUGGESTIONS,
            recentDocuments: MOCK_RECENT_DOCS,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleId = user?.roleIds?.[0] ?? "admin";
  const dashboards = template?.defaultRoleDashboards ?? defaultRoleDashboards ?? [];
  const kpiIds = getKpiIdsForRole(roleId, dashboards);

  const approvals = widgets?.approvals ?? MOCK_APPROVALS;
  const alerts = widgets?.alerts ?? MOCK_ALERTS;
  const suggestions = widgets?.suggestions ?? MOCK_SUGGESTIONS;
  const recentDocs = widgets?.recentDocuments ?? MOCK_RECENT_DOCS;

  return (
    <div className="space-y-6">
      {/* KPI row — role-based (mock until backend KPI aggregation exists) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiIds.map((id) => {
          const k = MOCK_KPIS[id];
          if (!k) return null;
          return (
            <DashboardKpiCard
              key={id}
              widgetId={id}
              label={k.label}
              value={k.value}
              change={k.change}
              description={k.description}
              icon={k.icon}
              sparkline={k.sparkline}
            />
          );
        })}
      </div>

      {/* Setup checklist + standard cards — approvals/alerts from backend when available */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SetupChecklistCard />
        <MyApprovalsCard items={approvals} />
        <MyTasksCard items={MOCK_TASKS} />
        <AlertsCard items={alerts} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CopilotSuggestionsCard items={suggestions} />
        <RecentDocumentsCard items={recentDocs} />
      </div>
    </div>
  );
}
