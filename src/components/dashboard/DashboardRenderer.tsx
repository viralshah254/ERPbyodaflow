"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import type { ApprovalItem, AlertItem, RecentDoc } from "@/lib/types/dashboard";
import { fetchDashboardWidgets } from "@/lib/api/dashboard";
import { DashboardKpiCard } from "./cards/DashboardKpiCard";
import { MyApprovalsCard } from "./cards/MyApprovalsCard";
import { AlertsCard } from "./cards/AlertsCard";
import { CopilotSuggestionsCard } from "./cards/CopilotSuggestionsCard";
import { RecentDocumentsCard } from "./cards/RecentDocumentsCard";
import { isOrgSetupComplete, SetupChecklistCard } from "./SetupChecklistCard";
import { DashboardGuidanceCard } from "./DashboardGuidanceCard";
import { fetchSetupStatusApi } from "@/lib/api/context";

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
  const [showSetupGuidance, setShowSetupGuidance] = React.useState(false);
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
    void fetchSetupStatusApi().then((status) => {
      if (!cancelled) setShowSetupGuidance(status != null && !isOrgSetupComplete(status));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div
        className={`grid gap-4 md:grid-cols-2 ${kpiIds.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
        data-tour-step="dashboard-kpis"
      >
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
              href={
                id === "pending-approvals"
                  ? "/approvals/inbox"
                  : id === "active-alerts"
                    ? "/inbox"
                    : id === "recent-documents"
                      ? "/docs"
                      : undefined
              }
            />
          );
        })}
      </div>

      {!compactOps && showSetupGuidance ? (
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardGuidanceCard pendingApprovals={approvals.length} />
          <SetupChecklistCard />
        </div>
      ) : null}

      {approvals.length === 0 && alerts.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">Nothing waiting on you</p>
              <p className="text-xs text-muted-foreground">Approvals and alerts are clear.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals/inbox">Approvals</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inbox">Inbox</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {approvals.length > 0 ? <MyApprovalsCard items={approvals} /> : null}
          {alerts.length > 0 ? <AlertsCard items={alerts} /> : null}
        </div>
      )}

      <div className={copilotEnabled && suggestions.length > 0 ? "grid gap-4 lg:grid-cols-2" : ""}>
        {copilotEnabled && suggestions.length > 0 ? <CopilotSuggestionsCard items={suggestions} /> : null}
        <RecentDocumentsCard items={recentDocs} />
      </div>
    </div>
  );
}
