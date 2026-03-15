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
import { toast } from "sonner";
import * as React from "react";

export default function AlertsPage() {
  const [alerts, setAlerts] = React.useState<InboxNotification[]>([]);
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
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
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
                  <Button variant="ghost" size="sm" onClick={() => void handleAcknowledge(alert.id)}>
                    <Icons.Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Icons.MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!loading && alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active alerts.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





