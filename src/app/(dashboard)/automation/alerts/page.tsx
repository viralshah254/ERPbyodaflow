"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

export default function AlertsPage() {
  return (
    <PageLayout
      title="Alerts & Notifications"
      description="Manage and respond to system alerts"
    >
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                title: "Stock below reorder level",
                description: "Product ABC123 has fallen below minimum stock",
                severity: "high",
                time: "2 hours ago",
              },
              {
                title: "Invoice overdue",
                description: "Invoice INV-001 from ABC Corp is 15 days overdue",
                severity: "medium",
                time: "5 hours ago",
              },
              {
                title: "Near expiry detected",
                description: "3 batches expiring within 30 days",
                severity: "medium",
                time: "1 day ago",
              },
            ].map((alert, i) => (
              <div
                key={i}
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
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.time}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Icons.Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Icons.MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}





