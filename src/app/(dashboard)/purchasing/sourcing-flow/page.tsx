"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchPurchaseOrders } from "@/lib/api/purchasing";
import { fetchCashDisbursements, fetchCashWeightAuditSummary } from "@/lib/api/cool-catch";
import { fetchLandedCostSources } from "@/lib/api/landed-cost";
import { fetchGRNs } from "@/lib/api/grn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type StepStatus = "complete" | "active" | "pending";

interface JourneyStep {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  whatYouDo: string;
  tip: string;
  tipIcon: React.ElementType;
  ctaLabel: string;
  ctaHref: string;
  secondaryCta?: { label: string; href: string };
  status: StepStatus;
  statBadge?: string;
  expandedContent?: React.ReactNode;
}

interface Stats {
  openPoCount: number;
  unresolvedVarianceCount: number;
  landedCostSourceCount: number;
  disbursementCount: number;
  postedGrnCount: number;
  receivedGrnCount: number;
}

function HealthMetric({
  label,
  value,
  status,
  loading,
}: {
  label: string;
  value: number;
  status: "good" | "warn" | "alert";
  loading: boolean;
}) {
  const colours = {
    good: "text-emerald-600 bg-emerald-50 border-emerald-200",
    warn: "text-amber-600 bg-amber-50 border-amber-200",
    alert: "text-red-600 bg-red-50 border-red-200",
  };
  const icons = {
    good: Icons.CheckCircle2,
    warn: Icons.AlertCircle,
    alert: Icons.XCircle,
  };
  const Icon = icons[status];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", colours[status])}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-xl font-bold leading-tight">{loading ? "—" : value}</p>
      </div>
    </div>
  );
}

function StepNumber({ n, status }: { n: number; status: StepStatus }) {
  if (status === "complete") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Icons.Check className="h-5 w-5" />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20">
        <span className="text-sm font-bold">{n}</span>
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-muted text-muted-foreground">
      <span className="text-sm font-semibold">{n}</span>
    </div>
  );
}

function LandedCostCentrePanel() {
  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Three separate cost centres to capture
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-start gap-2 rounded-md bg-background border p-3">
          <Icons.TrendingUp className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Currency conversion</p>
            <p className="text-xs text-muted-foreground">UGX/USD → KES at locked FX rate</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-md bg-background border p-3">
          <Icons.FileCheck className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Permits &amp; customs</p>
            <p className="text-xs text-muted-foreground">Fishing licences, border clearance</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-md bg-background border p-3">
          <Icons.Truck className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Inbound logistics</p>
            <p className="text-xs text-muted-foreground">Farm → hub freight &amp; handling</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        After applying all three, the system calculates your final landed cost per kg and posts to GL automatically.
      </p>
    </div>
  );
}

export default function SourcingFlowPage() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Stats>({
    openPoCount: 0,
    unresolvedVarianceCount: 0,
    landedCostSourceCount: 0,
    disbursementCount: 0,
    postedGrnCount: 0,
    receivedGrnCount: 0,
  });

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [orders, auditSummary, landedCostSources, disbursements, grns] = await Promise.all([
          fetchPurchaseOrders(),
          fetchCashWeightAuditSummary(),
          fetchLandedCostSources({ type: "grn" }),
          fetchCashDisbursements(),
          fetchGRNs(),
        ]);
        if (cancelled) return;
        setStats({
          openPoCount: orders.filter((r) => !["RECEIVED", "CANCELLED"].includes(r.status)).length,
          unresolvedVarianceCount:
            (auditSummary.summary?.varianceCount ?? 0) + (auditSummary.summary?.pendingCount ?? 0),
          // Match Inventory → Costing: only GRNs that still need an other-costs allocation (not total queue size).
          landedCostSourceCount: landedCostSources.filter((s) => !s.isAllocated).length,
          disbursementCount: disbursements.length,
          postedGrnCount: grns.filter((g) => g.status === "POSTED").length,
          receivedGrnCount: grns.filter((g) => g.status === "RECEIVED").length,
        });
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load sourcing flow.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const steps = React.useMemo((): JourneyStep[] => {
    const { openPoCount, unresolvedVarianceCount, landedCostSourceCount, disbursementCount, postedGrnCount, receivedGrnCount } = stats;

    const poComplete = openPoCount === 0;
    const disbComplete = disbursementCount > 0;
    const grnComplete = postedGrnCount > 0;
    const landedComplete = postedGrnCount > 0 && landedCostSourceCount === 0;
    const clearComplete = unresolvedVarianceCount === 0;

    const resolveStatus = (isDone: boolean, prevDone: boolean): StepStatus => {
      if (isDone) return "complete";
      if (prevDone) return "active";
      return "pending";
    };

    return [
      {
        id: "po",
        number: 1,
        title: "Create & approve purchase order",
        subtitle: "Set supplier, currency, and cross-border sourcing context",
        whatYouDo:
          "Create a purchase order for your fish supplier. Choose KES for local purchases or UGX for Ugandan cross-border sourcing. The system auto-fetches the exchange rate so your base-currency value is always accurate.",
        tip: "If buying in UGX, first confirm the exchange rate is loaded in Settings → Currencies → Exchange Rates. This rate will be locked against this PO.",
        tipIcon: Icons.Info,
        ctaLabel: "Create purchase order",
        ctaHref: "/docs/purchase-order/new",
        secondaryCta: { label: "View all POs", href: "/purchasing/orders" },
        status: resolveStatus(poComplete, true),
        statBadge: openPoCount > 0 ? `${openPoCount} open PO${openPoCount !== 1 ? "s" : ""}` : undefined,
      },
      {
        id: "cash",
        number: 2,
        title: "Record cash disbursement",
        subtitle: "Capture farm-gate cash outflow and paid weight",
        whatYouDo:
          "At the farm gate, record how much cash was paid and the weight (kg) of fish paid for. This creates a traceable link between your cash outflow and the expected stock — preventing leakage before goods reach the facility.",
        tip: "Record the exact paid weight in kg at the point of purchase. Discrepancies between paid weight and received weight are automatically flagged.",
        tipIcon: Icons.AlertCircle,
        ctaLabel: "Record cash disbursement",
        ctaHref: "/purchasing/cash-weight-audit",
        status: resolveStatus(disbComplete, poComplete),
        statBadge:
          disbursementCount > 0
            ? `${disbursementCount} disbursement${disbursementCount !== 1 ? "s" : ""} recorded`
            : undefined,
      },
      {
        id: "grn",
        number: 3,
        title: "Receive goods & confirm actual weight",
        subtitle: "Post GRN with weight received at the processing facility",
        whatYouDo:
          "When the fish arrives at your processing hub, create a Goods Receipt Note (GRN) and record the actual weight received. The system immediately computes transit shrinkage (paid weight minus received weight) and flags any variance for investigation.",
        tip: "The GRN received weight is the final inventory quantity. Ensure it is weighed after grading — any grading losses count as transit shrinkage.",
        tipIcon: Icons.Package,
        ctaLabel: "Receive goods (new GRN)",
        ctaHref: "/docs/grn/new",
        secondaryCta: { label: "View receiving queue", href: "/inventory/receiving" },
        status: resolveStatus(grnComplete, disbComplete),
        statBadge:
          postedGrnCount > 0
            ? `${postedGrnCount} GRN${postedGrnCount !== 1 ? "s" : ""} posted`
            : undefined,
      },
      {
        id: "landed",
        number: 4,
        title: "Apply landed costs",
        subtitle: "Allocate FX conversion, permits, and inbound logistics to inventory value",
        whatYouDo:
          "This is where the true cost of your stock is built. Walk through three cost centres in sequence: (1) currency conversion if the PO was in UGX, (2) permit and customs costs with their reference numbers, and (3) inbound freight from farm to facility. The wizard calculates your total landed cost and cost per kg automatically.",
        tip: "Use the guided wizard — it walks you through each cost centre one by one. You can skip any step that does not apply to this shipment.",
        tipIcon: Icons.Sparkles,
        ctaLabel: "Apply landed costs",
        ctaHref: "/inventory/costing",
        status: resolveStatus(landedComplete, grnComplete),
        statBadge:
          landedCostSourceCount > 0
            ? `${landedCostSourceCount} GRN${landedCostSourceCount !== 1 ? "s" : ""} awaiting costs`
            : undefined,
        expandedContent: <LandedCostCentrePanel />,
      },
      {
        id: "clearance",
        number: 5,
        title: "Resolve variances & clear posting",
        subtitle: "Investigate any weight exceptions, then run the three-way match",
        whatYouDo:
          "Before settling payment with your supplier, complete the three-way match: Purchase Order ↔ Cash Disbursed ↔ Weight Received. Any outstanding variance exceptions must be investigated and approved. Only then should the supplier bill be posted and payment released.",
        tip: "The three-way match blocks posting if unresolved cash-weight variances exist. Resolve all exceptions in the audit queue first.",
        tipIcon: Icons.ShieldCheck,
        ctaLabel: "Run three-way match",
        ctaHref: "/ap/three-way-match",
        secondaryCta: { label: "View variance exceptions", href: "/purchasing/cash-weight-audit" },
        status: resolveStatus(clearComplete, landedComplete),
        statBadge:
          unresolvedVarianceCount > 0
            ? `${unresolvedVarianceCount} variance exception${unresolvedVarianceCount !== 1 ? "s" : ""} open`
            : undefined,
      },
      {
        id: "processing",
        number: 6,
        title: "Process fish & capture yield",
        subtitle: "Convert received stock into outputs and track losses",
        whatYouDo:
          "After receipt and landed cost are complete, move into processing. Capture output yields, by-products, and losses so stock and cost per kg stay tied to actual plant performance.",
        tip: "Use Yield first for quick mass-balance capture, then use Subcontracting orders when external processors are involved.",
        tipIcon: Icons.Factory,
        ctaLabel: "Open yield capture",
        ctaHref: "/manufacturing/yield",
        secondaryCta: { label: "Open subcontracting", href: "/manufacturing/subcontracting/orders" },
        status: resolveStatus(receivedGrnCount > 0, clearComplete),
        statBadge:
          receivedGrnCount > 0
            ? `${receivedGrnCount} GRN${receivedGrnCount !== 1 ? "s" : ""} ready for processing`
            : undefined,
      },
    ];
  }, [stats]);

  const activeStepIndex = steps.findIndex((s) => s.status === "active");
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <PageShell>
      <PageHeader
        title="Procurement sourcing journey"
        description="Your step-by-step guide from farm-gate sourcing to final inventory valuation"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Sourcing Journey" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/finance/procurement-review">
              <Icons.BarChart2 className="mr-2 h-4 w-4" />
              Finance review
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Flow Health Bar */}
        <div data-tour-step="sourcing-flow-health">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Flow health
            </p>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${completedCount} of ${steps.length} steps complete`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HealthMetric
              label="Open purchase orders"
              value={stats.openPoCount}
              status={stats.openPoCount === 0 ? "good" : "warn"}
              loading={loading}
            />
            <HealthMetric
              label="Open variance exceptions"
              value={stats.unresolvedVarianceCount}
              status={stats.unresolvedVarianceCount === 0 ? "good" : "alert"}
              loading={loading}
            />
            <HealthMetric
              label="GRNs awaiting landed costs"
              value={stats.landedCostSourceCount}
              status={stats.landedCostSourceCount === 0 ? "good" : "warn"}
              loading={loading}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {completedCount}/{steps.length} steps done
          </p>
        </div>

        {/* Step cards */}
        <div className="space-y-3" data-tour-step="sourcing-step-cards">
          {steps.map((step, idx) => {
            const isActive = step.status === "active";
            const isComplete = step.status === "complete";
            const isPending = step.status === "pending";
            const TipIcon = step.tipIcon;

            return (
              <Card
                key={step.id}
                className={cn(
                  "transition-all duration-200",
                  isActive && "ring-2 ring-primary shadow-md",
                  isComplete && "opacity-80",
                  isPending && "opacity-60"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <StepNumber n={step.number} status={step.status} />
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={cn("font-semibold text-sm", isActive && "text-primary")}>
                              {step.title}
                            </h3>
                            {isActive && (
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                You are here
                              </Badge>
                            )}
                            {isComplete && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">
                                Done
                              </Badge>
                            )}
                            {step.statBadge && (
                              <Badge variant="secondary" className="text-xs">
                                {step.statBadge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</p>
                        </div>

                        {/* CTAs */}
                        <div className="flex items-center gap-2 shrink-0">
                          {step.secondaryCta && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={step.secondaryCta.href}>{step.secondaryCta.label}</Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            asChild
                            disabled={isPending}
                          >
                            <Link href={isPending ? "#" : step.ctaHref}>
                              {isActive && <Icons.ArrowRight className="mr-1.5 h-3.5 w-3.5" />}
                              {step.ctaLabel}
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Expanded content for active / always-show steps */}
                      {(isActive || idx === activeStepIndex) && (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.whatYouDo}</p>

                          <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2">
                            <TipIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <p className="text-xs text-muted-foreground">{step.tip}</p>
                          </div>

                          {step.expandedContent}
                        </div>
                      )}

                      {/* For completed steps: show compact tip */}
                      {isComplete && (
                        <p className="mt-1 text-xs text-emerald-600">
                          <Icons.CheckCircle2 className="inline mr-1 h-3 w-3" />
                          Completed — click to review or update
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* All done state */}
        {completedCount === steps.length && !loading && (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="flex items-center gap-4 py-5">
              <Icons.PartyPopper className="h-8 w-8 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">All steps complete — flow is clear!</p>
                <p className="text-sm text-emerald-700">
                  All POs received, variances resolved, and landed costs posted. Run inventory costing to update final
                  unit values.
                </p>
              </div>
              <Button size="sm" className="ml-auto shrink-0" asChild>
                <Link href="/inventory/costing">Run costing</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick-links footer */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Quick links
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Exchange rates", href: "/settings/financial/exchange-rates", icon: Icons.TrendingUp },
              { label: "Costing settings", href: "/settings/inventory/costing", icon: Icons.Settings },
              { label: "AP bills", href: "/ap/bills", icon: Icons.FileText },
              { label: "Payment runs", href: "/treasury/payment-runs", icon: Icons.Banknote },
              { label: "Inventory valuation", href: "/inventory/valuation", icon: Icons.Package },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Button key={link.href} variant="outline" size="sm" asChild>
                  <Link href={link.href}>
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
