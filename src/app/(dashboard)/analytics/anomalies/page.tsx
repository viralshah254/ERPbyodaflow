"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnomalyDetection } from "@/components/ai/anomaly-detection";
import { getMockAnomalies } from "@/lib/mock/anomalies";
import * as Icons from "lucide-react";

const INVESTIGATE_BY_TYPE: Record<string, string> = {
  PRICING: "/analytics/pricing",
  PAYROLL: "/analytics/payroll",
  INVENTORY: "/analytics/inventory",
  SALES: "/analytics/explore",
  PURCHASE: "/analytics/explore",
  FINANCE: "/analytics/finance",
  OTHER: "/analytics/explore",
};

export default function AnalyticsAnomaliesPage() {
  const anomalies = React.useMemo(() => getMockAnomalies(), []);
  const getInvestigateHref = React.useCallback((a: { type: string }) => INVESTIGATE_BY_TYPE[a.type] ?? "/analytics/explore", []);

  return (
    <PageShell>
      <PageHeader
        title="Anomalies"
        description="Price inversion, margin collapse, stock shrinkage, payroll spikes, tax inconsistencies"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Anomalies" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/automation/ai-insights">AI Insights</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <AnomalyDetection anomalies={anomalies} getInvestigateHref={getInvestigateHref} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.AlertCircle className="h-5 w-5" />
              Investigate → workflow
            </CardTitle>
            <CardDescription>
              Each anomaly links to drill target. Severity and affected entities drive prioritization. Action layer (Week 4) wires to approval, notification, investigation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </PageShell>
  );
}
