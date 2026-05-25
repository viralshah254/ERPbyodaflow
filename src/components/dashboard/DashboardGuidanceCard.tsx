"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchSetupStatusApi, type SetupStatus } from "@/lib/api/context";
import { Check, ChevronRight, Sparkles } from "lucide-react";

type SetupStep = {
  id: string;
  label: string;
  href: string;
  statusKey: keyof SetupStatus;
};

const SALES_SETUP_STEPS: SetupStep[] = [
  { id: "products", label: "Add products", href: "/master/products", statusKey: "productsDone" },
  { id: "customers", label: "Add customers", href: "/master/parties", statusKey: "customersDone" },
  {
    id: "sales-order",
    label: "Create sales order",
    href: "/docs/sales-order/new",
    statusKey: "salesOrdersDone",
  },
];

type QuickLink = {
  label: string;
  href: string;
  when?: (ctx: { status: SetupStatus; pendingApprovals: number }) => boolean;
};

const QUICK_LINKS: QuickLink[] = [
  {
    label: "Review approvals",
    href: "/approvals",
    when: ({ pendingApprovals }) => pendingApprovals > 0,
  },
  { label: "Create sales order", href: "/docs/sales-order/new" },
  { label: "Create purchase order", href: "/docs/purchase-order/new" },
  { label: "Create GRN", href: "/docs/grn/new" },
  { label: "Open documents", href: "/docs" },
  { label: "Control Tower", href: "/control-tower" },
];

function isSalesSetupComplete(status: SetupStatus): boolean {
  return SALES_SETUP_STEPS.every((step) => status[step.statusKey]);
}

interface DashboardGuidanceCardProps {
  pendingApprovals?: number;
}

export function DashboardGuidanceCard({ pendingApprovals = 0 }: DashboardGuidanceCardProps) {
  const [status, setStatus] = React.useState<SetupStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshStatus = React.useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchSetupStatusApi());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  React.useEffect(() => {
    const onFocus = () => void refreshStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshStatus]);

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Getting started</CardTitle>
          <CardDescription>Checking your workspace…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!status) return null;

  const salesSetupComplete = isSalesSetupComplete(status);
  const remainingSteps = SALES_SETUP_STEPS.filter((step) => !status[step.statusKey]);

  if (!salesSetupComplete) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Complete your sales setup ({remainingSteps.length} left)
          </CardTitle>
          <CardDescription>
            Finish the steps below using live data from your org — not page visits.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {SALES_SETUP_STEPS.map((step) => {
              const done = status[step.statusKey];
              return (
                <li key={step.id} className="flex items-center gap-2">
                  {done ? (
                    <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                  )}
                  <span className={done ? "line-through opacity-70" : undefined}>{step.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            {remainingSteps.map((step) => (
              <Button key={step.id} variant="outline" size="sm" asChild>
                <Link href={step.href}>
                  {step.label}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Link>
              </Button>
            ))}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tutorial" className="text-muted-foreground">
                Go to tutorial
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const quickLinks = QUICK_LINKS.filter(
    (link) => !link.when || link.when({ status, pendingApprovals }),
  );

  const summaryParts: string[] = [];
  if (status.salesOrdersDone) summaryParts.push("sales orders");
  if (status.purchaseOrdersDone) summaryParts.push("purchase orders");
  if (status.grnDone) summaryParts.push("GRNs");
  const activitySummary =
    summaryParts.length > 0
      ? `You already have ${summaryParts.join(", ")} in the system.`
      : "Your core master data is in place.";

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Suggested next steps
        </CardTitle>
        <CardDescription>
          {activitySummary}
          {pendingApprovals > 0
            ? ` ${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} need your attention.`
            : " Pick a shortcut below to keep moving."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Button
              key={link.href}
              variant={link.when ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={link.href}>
                {link.label}
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </Link>
            </Button>
          ))}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding" className="text-muted-foreground">
              Setup checklist
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
