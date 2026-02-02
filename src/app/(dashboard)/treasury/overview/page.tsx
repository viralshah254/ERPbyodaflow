"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMockPaymentRuns } from "@/lib/mock/treasury/payment-runs";
import { getMockOverdueInvoices } from "@/lib/mock/treasury/collections";
import { getMockCashflowForecast } from "@/lib/mock/treasury/cashflow";
import { getMockBankAccounts } from "@/lib/mock/treasury/bank-accounts";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/treasury/payment-runs", label: "Payment runs", desc: "AP payment runs, generate files", icon: "CreditCard" as const },
  { href: "/treasury/collections", label: "Collections", desc: "Overdue invoices, reminders", icon: "Receipt" as const },
  { href: "/treasury/bank-accounts", label: "Bank accounts", desc: "Manage bank accounts", icon: "Landmark" as const },
  { href: "/treasury/cashflow", label: "Cashflow", desc: "Forecast and drilldowns", icon: "TrendingUp" as const },
  { href: "/finance/bank-recon", label: "Bank reconciliation", desc: "Match statements", icon: "Wallet" as const },
];

export default function TreasuryOverviewPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const runs = React.useMemo(() => getMockPaymentRuns(), []);
  const overdue = React.useMemo(() => getMockOverdueInvoices(), []);
  const forecast = React.useMemo(() => getMockCashflowForecast(), []);
  const banks = React.useMemo(() => getMockBankAccounts(), []);

  const draftRuns = runs.filter((r) => r.status === "DRAFT" || r.status === "PENDING_APPROVAL");
  const overdueTotal = overdue.reduce((s, i) => s + i.outstanding, 0);
  const latestBalance = forecast.length > 0 ? forecast[forecast.length - 1]!.balance : 0;

  return (
    <PageShell>
      <PageHeader
        title="Treasury"
        description="Payment runs, collections, bank accounts, cashflow"
        breadcrumbs={[{ label: "Treasury" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => openWithPrompt("Summarize cashflow and suggest payment prioritization.")}>
            <Icons.Sparkles className="mr-2 h-4 w-4" />
            Ask Copilot
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick stats</span>
          <ExplainThis prompt="Explain payment runs, bank reconciliation, and cashflow forecast." label="Explain treasury" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projected balance</CardTitle>
              <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(latestBalance, "KES")}</div>
              <p className="text-xs text-muted-foreground">From forecast</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment runs</CardTitle>
              <Icons.CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftRuns.length}</div>
              <p className="text-xs text-muted-foreground">Draft / pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue receivables</CardTitle>
              <Icons.Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(overdueTotal, "KES")}</div>
              <p className="text-xs text-muted-foreground">{overdue.length} invoice(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bank accounts</CardTitle>
              <Icons.Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{banks.filter((b) => b.active).length}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Wallet) as React.ComponentType<{ className?: string }>;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
