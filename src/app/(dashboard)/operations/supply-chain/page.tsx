"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { isPerishableVerticalEnabled } from "@/lib/perishable-vertical";
import { fetchPurchaseOrders } from "@/lib/api/purchasing";
import {
  fetchCashWeightAuditSummary,
  fetchSubcontractOrders,
  fetchVMIReplenishmentOrders,
} from "@/lib/api/cool-catch";
import { fetchTransfers } from "@/lib/api/warehouse-transfers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type StageMetrics = {
  openPurchaseOrders: number;
  auditExceptions: number;
  subcontractInFlight: number;
  transfersInTransit: number;
  openReplenishments: number;
};

function MetricPill({ label, value, loading }: { label: string; value: number | null; loading: boolean }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{loading ? "—" : value ?? "—"}</p>
    </div>
  );
}

export default function SupplyChainJourneyPage() {
  const router = useRouter();
  const templateId = useOrgContextStore((s) => s.templateId);
  const featureFlags = useOrgContextStore((s) => s.featureFlags);
  const enabled = isPerishableVerticalEnabled(templateId, featureFlags ?? {});

  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<StageMetrics | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [orders, auditSummary, subOrders, inTransit, replen] = await Promise.all([
          fetchPurchaseOrders(),
          fetchCashWeightAuditSummary(),
          fetchSubcontractOrders(),
          fetchTransfers({ status: "IN_TRANSIT" }),
          fetchVMIReplenishmentOrders(),
        ]);
        if (cancelled) return;
        const openPo = orders.filter((r) => !["RECEIVED", "CANCELLED"].includes(r.status)).length;
        const auditExceptions =
          (auditSummary.summary?.varianceCount ?? 0) + (auditSummary.summary?.pendingCount ?? 0);
        const subFlight = subOrders.filter(
          (o) => o.status === "SENT" || (o.status as string) === "WIP"
        ).length;
        const replOpen = replen.filter((r) => r.status !== "RECEIVED").length;
        setMetrics({
          openPurchaseOrders: openPo,
          auditExceptions,
          subcontractInFlight: subFlight,
          transfersInTransit: inTransit.length,
          openReplenishments: replOpen,
        });
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load supply chain metrics.");
          setMetrics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, router]);

  if (!enabled) {
    return null;
  }

  const m = metrics;

  const stages = [
    {
      n: 1,
      title: "Sourcing",
      description: "Purchase orders, farm-gate cash and weight, goods receipt, and landed cost.",
      icon: Icons.ShoppingBag,
      metrics: (
        <div className="grid grid-cols-2 gap-2">
          <MetricPill label="Open POs" value={m?.openPurchaseOrders ?? null} loading={loading} />
          <MetricPill label="Audit items to clear" value={m?.auditExceptions ?? null} loading={loading} />
        </div>
      ),
      links: [
        { href: "/purchasing/sourcing-flow", label: "Guided sourcing flow" },
        { href: "/purchasing/orders", label: "Purchase orders" },
        { href: "/inventory/receipts", label: "Goods receipt (GRN)" },
        { href: "/purchasing/cash-weight-audit", label: "Cash-to-weight audit" },
      ],
    },
    {
      n: 2,
      title: "Processing",
      description: "Send raw stock to external processors; record outputs, yield, and fees.",
      icon: Icons.Factory,
      metrics: (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricPill label="Orders in flight (sent / WIP)" value={m?.subcontractInFlight ?? null} loading={loading} />
        </div>
      ),
      links: [
        { href: "/manufacturing/subcontracting", label: "Subcontracting" },
        { href: "/manufacturing/yield", label: "Yield / mass balance" },
        { href: "/manufacturing/byproducts", label: "Byproducts" },
      ],
    },
    {
      n: 3,
      title: "Logistics",
      description: "Inter-warehouse moves, route deliveries, and trip planning.",
      icon: Icons.Truck,
      metrics: (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricPill label="Transfers in transit" value={m?.transfersInTransit ?? null} loading={loading} />
        </div>
      ),
      links: [
        { href: "/warehouse/transfers", label: "Warehouse transfers" },
        { href: "/distribution/trips", label: "Trips / logistics" },
        { href: "/distribution/deliveries", label: "Deliveries" },
        { href: "/distribution/transfer-planning", label: "Transfer planning" },
      ],
    },
    {
      n: 4,
      title: "Franchise",
      description: "VMI replenishment, network health, and outlet coverage.",
      icon: Icons.Store,
      metrics: (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricPill label="Open replenishments" value={m?.openReplenishments ?? null} loading={loading} />
        </div>
      ),
      links: [
        { href: "/franchise/vmi", label: "VMI & replenishment" },
        { href: "/franchise/overview", label: "Franchise overview" },
        { href: "/franchise/outlets", label: "Manage franchisees" },
        { href: "/control-tower", label: "Control Tower (detail)" },
      ],
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Supply chain journey"
        description="From sourcing through processing and logistics to franchise outlets — quick links and live counts."
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/control-tower">
              <Icons.Gauge className="mr-2 h-4 w-4" />
              Control Tower
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Flow</span>
          {stages.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 ? <Icons.ChevronRight className="h-4 w-4 shrink-0 opacity-50" /> : null}
              <Badge variant="secondary" className="font-normal">
                {s.n}. {s.title}
              </Badge>
            </React.Fragment>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.n} className={cn("overflow-hidden border-l-4 border-l-primary/60")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {stage.n}
                        </span>
                        <CardTitle className="text-lg">{stage.title}</CardTitle>
                      </div>
                      <CardDescription>{stage.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stage.metrics}
                  <div className="flex flex-wrap gap-2">
                    {stage.links.map((l) => (
                      <Button key={l.href} variant="outline" size="sm" asChild>
                        <Link href={l.href}>{l.label}</Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
