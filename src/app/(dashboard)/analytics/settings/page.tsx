"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { METRICS, DIMENSIONS } from "@/lib/analytics";
import type { MetricKey, DimensionKey } from "@/lib/analytics/semantic";

export default function AnalyticsSettingsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Analytics settings"
        description="Metrics, dimensions, defaults — semantic engine registry"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Settings" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Metrics</CardTitle>
            <CardDescription>
              Each metric: label, format, allowed dimensions, default viz, drill target.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left font-medium px-3 py-2">Key</th>
                    <th className="text-left font-medium px-3 py-2">Label</th>
                    <th className="text-left font-medium px-3 py-2">Format</th>
                    <th className="text-left font-medium px-3 py-2">Default viz</th>
                    <th className="text-left font-medium px-3 py-2">Drill target</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(METRICS) as MetricKey[]).map((k) => {
                    const m = METRICS[k];
                    return (
                      <tr key={k} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{m.key}</td>
                        <td className="px-3 py-2">{m.label}</td>
                        <td className="px-3 py-2">{m.format}</td>
                        <td className="px-3 py-2">{m.defaultVisualization}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.drillTarget}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dimensions</CardTitle>
            <CardDescription>
              Available for slicing metrics. Explorer limits to 3 per view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIMENSIONS) as DimensionKey[]).map((k) => {
                const d = DIMENSIONS[k];
                return (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                  >
                    {d.label}
                    {d.hint && <span className="ml-1 text-muted-foreground">({d.hint})</span>}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
