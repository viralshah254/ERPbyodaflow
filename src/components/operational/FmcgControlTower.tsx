"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import {
  fetchFmcgControlTower,
  type FmcgControlTowerException,
  type FmcgControlTowerSnapshot,
} from "@/lib/api/fmcg-control-tower";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { useNavCounts } from "@/lib/use-nav-counts";
import { canonicalIndustryTemplateId } from "@/config/industry";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  dateFrom: string;
  dateTo: string;
  refreshKey: number;
  onLoadingChange?: (loading: boolean) => void;
  onRefreshed?: (at: Date) => void;
};

/** List pages do not have an id route. Open the document itself. */
function documentWorkHref(href: string): string {
  const rules: Array<[RegExp, string]> = [
    [/^\/sales\/orders\/([^/]+)$/, "/docs/sales-order/$1"],
    [/^\/sales\/invoices\/([^/]+)$/, "/docs/invoice/$1"],
    [/^\/ap\/bills\/([^/]+)$/, "/docs/bill/$1"],
  ];
  for (const [pattern, target] of rules) {
    const match = href.match(pattern);
    if (match?.[1]) return target.replace("$1", match[1]);
  }
  return href;
}

const categoryIcon: Record<FmcgControlTowerException["category"], React.ElementType> = {
  DOCUMENT: Icons.FileWarning,
  QUALITY: Icons.ShieldAlert,
  PRODUCTION: Icons.Factory,
  AUTOMATION: Icons.Workflow,
  FINANCE: Icons.Landmark,
};

export function FmcgControlTower({
  dateFrom,
  dateTo,
  refreshKey,
  onLoadingChange,
  onRefreshed,
}: Props) {
  const [snapshot, setSnapshot] = React.useState<FmcgControlTowerSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);
  const [onTheRoad, setOnTheRoad] = React.useState<number | null>(null);
  const [waitingToLeave, setWaitingToLeave] = React.useState<number | null>(null);
  const navCounts = useNavCounts();
  const templateId = useOrgContextStore((s) => s.templateId);
  const bakery = canonicalIndustryTemplateId(templateId) === "fmcg-bakery";
  const productionHref = bakery ? "/manufacturing/production-plan" : "/manufacturing/work-orders";

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    onLoadingChange?.(true);
    fetchFmcgControlTower({ from: dateFrom, to: dateTo })
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        onRefreshed?.(new Date(data.generatedAt));
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unable to load the FMCG control tower.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        onLoadingChange?.(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, refreshKey, retryKey, onLoadingChange, onRefreshed]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchDocumentListPageApi("delivery-note", { limit: 1, status: "IN_TRANSIT" }).catch(() => null),
      fetchDocumentListPageApi("delivery-note", { limit: 1, status: "DRAFT" }).catch(() => null),
    ]).then(([transit, drafts]) => {
      if (cancelled) return;
      setOnTheRoad(transit?.total ?? null);
      setWaitingToLeave(drafts?.total ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, retryKey]);

  if (loading && !snapshot) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Icons.RefreshCw className="h-4 w-4 animate-spin" />
        Reconciling operational facts…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40" data-tutorial-hint="fmcg-control-tower-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icons.CircleAlert className="h-4 w-4 text-destructive" />
            Control tower could not be loaded
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => setRetryKey((value) => value + 1)}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) return null;
  const { metrics } = snapshot;
  const hasFacts =
    metrics.salesOrders +
      metrics.postedInvoices +
      metrics.quarantinedLots +
      metrics.pendingQcLots +
      metrics.activeWorkOrders +
      metrics.unmatchedBankLines +
      snapshot.exceptions.length >
    0;

  return (
    <div className="space-y-6">
      {!hasFacts ? (
        <Card data-tutorial-hint="fmcg-control-tower-empty">
          <CardHeader>
            <CardTitle className="text-base">No facts in this date range</CardTitle>
            <CardDescription>
              Post sales, receive a lot, or release a work order. This view never substitutes sample data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/sales/orders">Sales orders</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory/receiving">Receive stock</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/work-orders">Work orders</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <PlantDay
        openOrders={metrics.openSalesOrders}
        onTheRoad={onTheRoad}
        waitingToLeave={waitingToLeave}
        fieldOrders={navCounts["odaflow-sync-queue"] ?? 0}
        customersWaiting={navCounts["sales-customer-approvals"] ?? 0}
        activeWorkOrders={metrics.activeWorkOrders}
        productionHref={productionHref}
        bakery={bakery}
      />

      <section className="space-y-3" data-tutorial-hint="fmcg-control-tower-kpis">
        <div>
          <h2 className="text-base font-semibold">Books, stock, and close</h2>
          <p className="text-sm text-muted-foreground">
            Posted sales in the selected dates, plus live lot, production, and period controls.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard
            title="Posted Revenue"
            value={formatMoney(metrics.postedRevenue, "KES")}
            subtitle={`${metrics.postedInvoices} posted invoices`}
            severity="success"
            href="/sales/invoices"
          />
          <OperationalKpiCard
            title="Open Sales Orders"
            value={metrics.openSalesOrders}
            subtitle={`${metrics.salesOrders} orders in range`}
            severity={metrics.openSalesOrders > 0 ? "warning" : "success"}
            href="/sales/orders"
          />
          <OperationalKpiCard
            title="QC Holds"
            value={metrics.quarantinedLots + metrics.pendingQcLots}
            subtitle={`${metrics.quarantinedLots} quarantined · ${metrics.pendingQcLots} pending QC`}
            severity={metrics.quarantinedLots + metrics.pendingQcLots > 0 ? "warning" : "success"}
            href="/inventory/stock-levels"
          />
          <OperationalKpiCard
            title="Expiring in 30 Days"
            value={metrics.expiringLots}
            subtitle="Available lots approaching expiry"
            severity={metrics.expiringLots > 0 ? "warning" : "success"}
            href="/inventory/stock-levels"
          />
          <OperationalKpiCard
            title="Active Work Orders"
            value={metrics.activeWorkOrders}
            subtitle={`${metrics.workOrderVariances} completed with variance`}
            severity={metrics.workOrderVariances > 0 ? "warning" : "default"}
            href="/manufacturing/work-orders"
          />
          <OperationalKpiCard
            title="Automation Dead Letters"
            value={metrics.automationDeadLetters}
            subtitle="Automation runs and outbox delivery"
            severity={metrics.automationDeadLetters > 0 ? "danger" : "success"}
            href="/automation/rules"
          />
          <OperationalKpiCard
            title="Unmatched Bank Lines"
            value={metrics.unmatchedBankLines}
            subtitle={formatMoney(metrics.unmatchedBankAmount, "KES")}
            severity={metrics.unmatchedBankLines > 0 ? "warning" : "success"}
            href="/finance/bank-recon"
          />
          <OperationalKpiCard
            title="Overdue Open Periods"
            value={metrics.overdueOpenPeriods}
            subtitle="Ended periods not yet closed"
            severity={metrics.overdueOpenPeriods > 0 ? "danger" : "success"}
            href="/finance/period-close"
          />
        </div>
      </section>

      <Card data-tutorial-hint="fmcg-control-tower-exceptions">
        <CardHeader>
          <CardTitle>Exception center</CardTitle>
          <CardDescription>
            Reconciliation failures and controls that need an owner. Open a row to work on its source record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.exceptions.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              <Icons.CircleCheck className="h-5 w-5 text-emerald-600" />
              No active exceptions were found in the reconciled facts.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {snapshot.exceptions.map((exception) => {
                const Icon = categoryIcon[exception.category];
                return (
                  <Link
                    key={exception.id}
                    href={documentWorkHref(exception.href)}
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50"
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        exception.severity === "critical" ? "text-destructive" : "text-amber-600"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{exception.title}</span>
                        <Badge variant={exception.severity === "critical" ? "destructive" : "secondary"}>
                          {exception.category.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{exception.detail}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(exception.occurredAt).toLocaleString()}
                      </p>
                    </div>
                    <Icons.ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlantDay({
  openOrders,
  onTheRoad,
  waitingToLeave,
  fieldOrders,
  customersWaiting,
  activeWorkOrders,
  productionHref,
  bakery,
}: {
  openOrders: number;
  onTheRoad: number | null;
  waitingToLeave: number | null;
  fieldOrders: number;
  customersWaiting: number;
  activeWorkOrders: number;
  productionHref: string;
  bakery: boolean;
}) {
  const lineIdle = activeWorkOrders === 0 && openOrders > 0;
  const cards: Array<{
    title: string;
    value: string;
    detail: string;
    href: string;
    hot: boolean;
  }> = [
    {
      title: "Open orders",
      value: String(openOrders),
      detail: "Still to pick, pack, or invoice.",
      href: "/sales/orders",
      hot: openOrders > 0,
    },
    {
      title: "On the road",
      value: onTheRoad == null ? "—" : String(onTheRoad),
      detail: "Delivery notes that have left the warehouse.",
      href: "/docs/delivery-note?status=IN_TRANSIT",
      hot: (onTheRoad ?? 0) > 0,
    },
    {
      title: "Waiting to leave",
      value: waitingToLeave == null ? "—" : String(waitingToLeave),
      detail: "Delivery notes still in draft.",
      href: "/docs/delivery-note?status=DRAFT",
      hot: (waitingToLeave ?? 0) > 0,
    },
    {
      title: "Field orders",
      value: String(fieldOrders),
      detail: "LPOs and rep orders not yet booked.",
      href: "/sales/odaflow-sync-queue",
      hot: fieldOrders > 0,
    },
    {
      title: "New customers",
      value: String(customersWaiting),
      detail: "Sent from the field, not yet on your books.",
      href: "/sales/customer-approvals",
      hot: customersWaiting > 0,
    },
    {
      title: bakery ? "Batches" : "On the line",
      value: String(activeWorkOrders),
      detail: lineIdle
        ? "Orders are open and nothing is in production."
        : bakery
          ? "Production batches currently running."
          : "Work orders released or in progress.",
      href: productionHref,
      hot: lineIdle,
    },
  ];

  return (
    <section className="space-y-3" data-tutorial-hint="fmcg-plant-day">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Today on the floor</h2>
          <p className="text-sm text-muted-foreground">
            Ship what is promised, book what the field sent, and make what stock cannot cover.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/dispatch">Dispatch</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/pick-pack">Pick and pack</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/stock-levels">Finished goods</Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15.5rem),1fr))]">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={cn(
              "rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40",
              card.hot && "border-amber-500/40",
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.title}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
