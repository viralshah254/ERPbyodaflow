"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";
import Link from "next/link";

const MOCK_APPROVALS = [
  { id: "1", ref: "PO-2025-101", summary: "Office supplies KES 85,000", requestedBy: "Jane Doe", severity: "medium" as const },
  { id: "2", ref: "SO-2025-205", summary: "Bulk order ABC Ltd KES 320,000", requestedBy: "John Smith", severity: "high" as const },
];

const MOCK_ALERTS = [
  { id: "1", title: "Low stock", message: "Widget B below reorder level.", severity: "warning" as const, suggested: "Create purchase order" },
  { id: "2", title: "Overdue receivable", message: "INV-2025-089 30+ days. KES 45,000.", severity: "error" as const, suggested: "Send reminder" },
];

const MOCK_TASKS = [
  { id: "1", title: "Review low stock report", due: "2025-01-28", status: "pending" as const },
  { id: "2", title: "Approve PO-2025-101", due: "2025-01-27", status: "overdue" as const },
];

const severityIcon: Record<string, string> = {
  low: "Info",
  medium: "AlertTriangle",
  high: "AlertCircle",
  warning: "AlertTriangle",
  error: "AlertCircle",
};

export default function InboxPage() {
  return (
    <PageLayout
      title="Inbox"
      description="Approvals, alerts, and tasks"
    >
      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="approvals">
            Approvals
            <Badge variant="secondary" className="ml-1.5">{MOCK_APPROVALS.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            <Badge variant="secondary" className="ml-1.5">{MOCK_ALERTS.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            <Badge variant="secondary" className="ml-1.5">{MOCK_TASKS.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_APPROVALS.map((a) => {
                  const Icon = Icons[severityIcon[a.severity] as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{a.ref}</p>
                          <p className="text-sm text-muted-foreground">{a.summary}</p>
                          <p className="text-xs text-muted-foreground">Requested by {a.requestedBy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Suggested: Approve or reject</span>
                        <Button size="sm">Approve</Button>
                        <Button size="sm" variant="outline">Reject</Button>
                        <Button size="sm" variant="ghost">Assign</Button>
                      </div>
                    </div>
                  );
                })}
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
                {MOCK_ALERTS.map((a) => {
                  const Icon = Icons[severityIcon[a.severity] as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${a.severity === "error" ? "border-destructive/50 bg-destructive/5" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${a.severity === "error" ? "text-destructive" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-sm text-muted-foreground">{a.message}</p>
                          {a.suggested && (
                            <p className="text-xs text-primary mt-1">Suggested: {a.suggested}</p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  );
                })}
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
              <div className="space-y-3">
                {MOCK_TASKS.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${t.status === "overdue" ? "border-destructive/50 bg-destructive/5" : ""}`}
                  >
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className={`text-xs ${t.status === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                        Due {t.due} {t.status === "overdue" ? "· Overdue" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm">Start</Button>
                      <Button size="sm" variant="outline">Assign</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
