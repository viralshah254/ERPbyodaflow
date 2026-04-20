"use client";

import * as React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import type { ApprovalItem, AlertItem, RecentDoc } from "@/lib/types/dashboard";
import { fetchDashboardWidgets } from "@/lib/api/dashboard";
import { DashboardKpiCard } from "./cards/DashboardKpiCard";
import { MyApprovalsCard } from "./cards/MyApprovalsCard";
import { MyTasksCard } from "./cards/MyTasksCard";
import { AlertsCard } from "./cards/AlertsCard";
import { CopilotSuggestionsCard } from "./cards/CopilotSuggestionsCard";
import { RecentDocumentsCard } from "./cards/RecentDocumentsCard";
import { SetupChecklistCard } from "./SetupChecklistCard";
import { GuidedWorkflowCard } from "@/components/tutorial/GuidedWorkflowCard";

const ADMIN_KPI_IDS = [
  "pending-approvals",
  "active-alerts",
  "recent-documents",
  "copilot-suggestions",
];

function getKpiIdsForRole(
  roleId: string | undefined,
  defaultRoleDashboards: { roleId: string; widgetIds: string[] }[]
): string[] {
  const found = defaultRoleDashboards.find((r) => r.roleId === roleId);
  if (found && found.widgetIds.length > 0) return found.widgetIds;
  return ADMIN_KPI_IDS;
}

export function DashboardRenderer() {
  const user = useAuthStore((s) => s.user);
  const { template, defaultRoleDashboards } = useOrgContextStore();
  const copilotEnabled = useCopilotFeatureEnabled();
  const [widgets, setWidgets] = React.useState<{
    approvals: ApprovalItem[];
    alerts: AlertItem[];
    suggestions: Array<{ id: string; type: string; title: string; description: string; actionUrl: string }>;
    recentDocuments: RecentDoc[];
  }>({
    approvals: [],
    alerts: [],
    suggestions: [],
    recentDocuments: [],
  });

  React.useEffect(() => {
    let cancelled = false;
    fetchDashboardWidgets()
      .then((data) => {
        if (!cancelled) {
          setWidgets({
            approvals: data.approvals,
            alerts: data.alerts,
            suggestions: data.suggestions,
            recentDocuments: data.recentDocuments,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWidgets({ approvals: [], alerts: [], suggestions: [], recentDocuments: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleId = user?.roleIds?.[0] ?? "admin";
  const dashboards = template?.defaultRoleDashboards ?? defaultRoleDashboards ?? [];
  const kpiIds = getKpiIdsForRole(roleId, dashboards).filter(
    (id) => copilotEnabled || id !== "copilot-suggestions"
  );

  const compactOps = template?.compactOperationalDashboard === true;

  const approvals = widgets.approvals;
  const alerts = widgets.alerts;
  const suggestions = widgets.suggestions;
  const recentDocs = widgets.recentDocuments;

  const kpiById: Record<
    string,
    {
      label: string;
      value: string | number;
      description?: string;
      icon?: string;
      change?: { value: string; type: "increase" | "decrease" | "neutral" };
      sparkline?: boolean;
    }
  > = {
    "pending-approvals": {
      label: "Pending approvals",
      value: approvals.length,
      description: "Awaiting your action",
      icon: "CheckCheck",
    },
    "active-alerts": {
      label: "Active alerts",
      value: alerts.length,
      description: "Requires attention",
      icon: "AlertTriangle",
    },
    "recent-documents": {
      label: "Recent documents",
      value: recentDocs.length,
      description: "Recently updated",
      icon: "FileText",
    },
    "copilot-suggestions": {
      label: "Copilot suggestions",
      value: suggestions.length,
      description: "Operational recommendations",
      icon: "Sparkles",
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour-step="dashboard-kpis">
        {kpiIds.map((id) => {
          const k = kpiById[id];
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

      {/* Guided workflow for new users + Setup checklist (hidden for compact operational templates e.g. seafood) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!compactOps ? (
          <>
            <GuidedWorkflowCard
              title="Create your first sales order"
              description="Set up products and customers, then create a sales order."
              steps={[
                { label: "Add products", href: "/master/products" },
                { label: "Add customers", href: "/master/parties" },
                { label: "Create sales order", href: "/docs/sales-order/new" },
              ]}
              showWhenExploredLessThan={5}
            />
            <SetupChecklistCard />
          </>
        ) : null}
        <MyApprovalsCard items={approvals} />
        <MyTasksCard items={[]} />
        <AlertsCard items={alerts} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {copilotEnabled ? <CopilotSuggestionsCard items={suggestions} /> : null}
        <RecentDocumentsCard items={recentDocs} />
      </div>
    </div>
  );
}
