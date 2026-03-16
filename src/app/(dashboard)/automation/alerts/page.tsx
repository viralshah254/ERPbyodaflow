"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import {
  acknowledgeNotificationApi,
  fetchInboxNotificationsApi,
  syncOverdueAlertsApi,
  type InboxNotification,
} from "@/lib/api/notifications";
import { drillFromNotification } from "@/lib/drill-through";
import { toast } from "sonner";
import * as React from "react";
import Link from "next/link";

export default function AlertsPage() {
  const [alerts, setAlerts] = React.useState<InboxNotification[]>([]);
  const [filter, setFilter] = React.useState<"all" | "credit-risk" | "approval-updates">("all");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await syncOverdueAlertsApi();
      const items = await fetchInboxNotificationsApi();
      setAlerts(items);
      if (result.created > 0) {
        toast.success(`Generated ${result.created} overdue alert(s).`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeNotificationApi(id);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to acknowledge alert.");
    }
  };

  const filteredAlerts = React.useMemo(() => {
    if (filter === "credit-risk") {
      return alerts.filter(
        (alert) =>
          alert.dedupeKey?.includes("credit-") ||
          /credit|overdue/i.test(`${alert.title} ${alert.message}`)
      );
    }
    if (filter === "approval-updates") {
      return alerts.filter(
        (alert) =>
          alert.dedupeKey?.includes("approval-") ||
          /approval|approved|rejected/i.test(`${alert.title} ${alert.message}`)
      );
    }
    return alerts;
  }, [alerts, filter]);

  const creditRiskCount = React.useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.dedupeKey?.includes("credit-") ||
          /credit|overdue/i.test(`${alert.title} ${alert.message}`)
      ).length,
    [alerts]
  );

  const approvalUpdateCount = React.useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.dedupeKey?.includes("approval-") ||
          /approval|approved|rejected/i.test(`${alert.title} ${alert.message}`)
      ).length,
    [alerts]
  );

  return (
    <PageLayout
      title="Alerts & Notifications"
      description="Manage and respond to system alerts"
      actions={
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <Icons.RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              All ({alerts.length})
            </Button>
            <Button
              size="sm"
              variant={filter === "credit-risk" ? "default" : "outline"}
              onClick={() => setFilter("credit-risk")}
            >
              Credit Risk ({creditRiskCount})
            </Button>
            <Button
              size="sm"
              variant={filter === "approval-updates" ? "default" : "outline"}
              onClick={() => setFilter("approval-updates")}
            >
              Approval Updates ({approvalUpdateCount})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const drillLink = drillFromNotification(alert);
              return (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <Badge
                        variant={
                          alert.severity === "high"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={drillLink.href}>{drillLink.label}</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleAcknowledge(alert.id)}>
                      <Icons.Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Icons.MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!loading && filteredAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filter === "credit-risk"
                  ? "No active credit risk alerts."
                  : filter === "approval-updates"
                    ? "No approval updates right now."
                    : "No active alerts."}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





