"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import Link from "next/link";
import { fetchApprovalInbox } from "@/lib/api/approvals";
import { acknowledgeNotificationApi, fetchInboxNotificationsApi, type InboxNotification } from "@/lib/api/notifications";
import type { ApprovalItem } from "@/lib/types/approvals";
import { formatMoney } from "@/lib/money";
import { drillFromNotification, drillToApprovalInbox } from "@/lib/drill-through";
import { toast } from "sonner";

const severityIcon: Record<string, string> = {
  low: "Info",
  medium: "AlertTriangle",
  high: "AlertCircle",
  warning: "AlertTriangle",
  error: "AlertCircle",
};

export default function InboxPage() {
  const [approvals, setApprovals] = React.useState<ApprovalItem[]>([]);
  const [alerts, setAlerts] = React.useState<InboxNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [approvalItems, notificationItems] = await Promise.all([
        fetchApprovalInbox(),
        fetchInboxNotificationsApi(),
      ]);
      setApprovals(approvalItems);
      setAlerts(notificationItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageLayout
      title="Inbox"
      description="Approvals, alerts, and tasks"
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <Icons.RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="approvals">
            Approvals
            <Badge variant="secondary" className="ml-1.5">{approvals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            <Badge variant="secondary" className="ml-1.5">{alerts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            <Badge variant="secondary" className="ml-1.5">0</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvals.map((a) => {
                  const severity = a.creditBreachReason ? "high" : "medium";
                  const Icon = Icons[severityIcon[severity] as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
                  const approvalLink = drillToApprovalInbox(a.id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{a.documentNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {a.documentType} · {formatMoney(a.amount, a.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">Requested by {a.requester}</p>
                          {a.creditBreachReason && (
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              Credit breach flagged
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Open the exact approval to act</span>
                        <Button size="sm" asChild>
                          <Link href={approvalLink.href}>{approvalLink.label}</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!loading && approvals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending approvals.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((a) => {
                  const kind = a.dedupeKey?.includes("credit-")
                    ? "Credit risk"
                    : a.dedupeKey?.includes("approval-")
                      ? "Approval update"
                      : "Alert";
                  const hasErrorStyle = a.severity === "high";
                  const Icon = Icons[severityIcon[a.severity] as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
                  const drillLink = drillFromNotification(a);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${hasErrorStyle ? "border-destructive/50 bg-destructive/5" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${hasErrorStyle ? "text-destructive" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-sm text-muted-foreground">{a.message}</p>
                          <p className="text-xs text-primary mt-1">{kind}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={drillLink.href}>{drillLink.label}</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void acknowledgeNotificationApi(a.id).then(load)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!loading && alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active alerts.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Unified task routing is not wired yet. Use approvals and alerts tabs for live action items.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
