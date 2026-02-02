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

  const roleId = user?.roleIds?.[0] ?? "admin";
  const dashboards = template?.defaultRoleDashboards ?? defaultRoleDashboards ?? [];
  const kpiIds = getKpiIdsForRole(roleId, dashboards);

  return (
    <div className="space-y-6">
      {/* KPI row — role-based */}
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

      {/* Setup checklist + standard cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SetupChecklistCard />
        <MyApprovalsCard items={MOCK_APPROVALS} />
        <MyTasksCard items={MOCK_TASKS} />
        <AlertsCard items={MOCK_ALERTS} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CopilotSuggestionsCard items={MOCK_SUGGESTIONS} />
        <RecentDocumentsCard items={MOCK_RECENT_DOCS} />
      </div>
    </div>
  );
}
