"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import type { AlertItem } from "@/lib/mock/dashboard";
import { cn } from "@/lib/utils";

interface AlertsCardProps {
  items: AlertItem[];
}

const severityIcon: Record<AlertItem["severity"], string> = {
  info: "Info",
  warning: "AlertTriangle",
  error: "AlertCircle",
};

export function AlertsCard({ items }: AlertsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Alerts</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inbox">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No alerts.</p>
        ) : (
          <div className="space-y-2">
            {items.map((a) => {
              const Icon = Icons[severityIcon[a.severity] as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm",
                    a.severity === "error" && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      a.severity === "error" ? "text-destructive" : "text-muted-foreground"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-xs">{a.message}</p>
                    {a.suggestedAction && (
                      <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs">
                        {a.suggestedAction} →
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
