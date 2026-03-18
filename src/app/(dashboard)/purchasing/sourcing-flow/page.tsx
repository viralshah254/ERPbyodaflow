"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchPurchaseOrders } from "@/lib/api/purchasing";
import { fetchCashWeightAuditSummary } from "@/lib/api/cool-catch";
import { fetchLandedCostSources } from "@/lib/api/landed-cost";
import { toast } from "sonner";

type StepStatus = "complete" | "pending";

export default function SourcingFlowPage() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    openPoCount: 0,
    unresolvedVarianceCount: 0,
    landedCostSourceCount: 0,
  });

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [orders, auditSummary, landedCostSources] = await Promise.all([
          fetchPurchaseOrders(),
          fetchCashWeightAuditSummary(),
          fetchLandedCostSources({ type: "grn" }),
        ]);
        if (cancelled) return;
        setStats({
          openPoCount: orders.filter((row) => row.status !== "RECEIVED").length,
          unresolvedVarianceCount:
            (auditSummary.summary?.varianceCount ?? 0) + (auditSummary.summary?.pendingCount ?? 0),
          landedCostSourceCount: landedCostSources.length,
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load sourcing flow status.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const steps: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    status: StepStatus;
    note?: string;
  }> = [
    {
      id: "po",
      title: "1. Create or approve purchase order",
      description: "Set supplier, currency (KES/UGX), and cross-border sourcing context.",
      href: "/purchasing/orders",
      status: stats.openPoCount > 0 ? "pending" : "complete",
      note: `${stats.openPoCount} open PO(s)`,
    },
    {
      id: "cash",
      title: "2. Record cash disbursement",
      description: "Capture farm-gate cash outflow linked to PO lines and paid weight.",
      href: "/purchasing/cash-weight-audit",
      status: stats.unresolvedVarianceCount > 0 ? "pending" : "complete",
      note: `${stats.unresolvedVarianceCount} open variance exception(s)`,
    },
    {
      id: "grn",
      title: "3. Receive and confirm actual weight",
      description: "Post GRN with received weight to enable three-way integrity checks.",
      href: "/inventory/receiving",
      status: stats.unresolvedVarianceCount > 0 ? "pending" : "complete",
    },
    {
      id: "landed",
      title: "4. Apply landed costs",
      description: "Allocate permits, border logistics, and inbound freight to inventory value.",
      href: "/inventory/costing",
      status: stats.landedCostSourceCount > 0 ? "complete" : "pending",
      note: `${stats.landedCostSourceCount} GRN/Bill source(s) available`,
    },
    {
      id: "clearance",
      title: "5. Resolve variances and clear posting",
      description: "Only clear payments and posting after unresolved variances are investigated.",
      href: "/purchasing/cash-weight-audit",
      status: stats.unresolvedVarianceCount === 0 ? "complete" : "pending",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Guided Sourcing Flow"
        description="PO -> Cash -> Weight Received -> Landed Costs -> Reconciliation"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Guided Sourcing Flow" },
        ]}
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Flow Health</CardTitle>
            <CardDescription>
              Keep this board green before bill settlement and final posting.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Open POs</p>
              <p className="text-2xl font-semibold">{loading ? "…" : stats.openPoCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Variance Exceptions</p>
              <p className="text-2xl font-semibold">{loading ? "…" : stats.unresolvedVarianceCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Landed Cost Sources</p>
              <p className="text-2xl font-semibold">{loading ? "…" : stats.landedCostSourceCount}</p>
            </div>
          </CardContent>
        </Card>

        {steps.map((step) => (
          <Card key={step.id}>
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{step.title}</p>
                  <Badge variant={step.status === "complete" ? "default" : "secondary"}>
                    {step.status === "complete" ? "Complete" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.note ? <p className="text-xs text-muted-foreground mt-1">{step.note}</p> : null}
              </div>
              <Button asChild variant="outline">
                <Link href={step.href}>Open step</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

