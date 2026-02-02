"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listEmployees, listPayRuns } from "@/lib/data/payroll.repo";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/payroll/employees", label: "Employees", desc: "Personal, job, pay, bank", icon: "Users" as const },
  { href: "/payroll/pay-runs", label: "Pay runs", desc: "Create, preview, approve, post", icon: "CreditCard" as const },
  { href: "/payroll/payslips", label: "Payslips", desc: "Preview, download PDF", icon: "FileText" as const },
  { href: "/payroll/statutories", label: "Statutories", desc: "Kenya NSSF, NHIF, PAYE", icon: "ShieldCheck" as const },
  { href: "/settings/payroll", label: "Payroll settings", desc: "Company-level config", icon: "Settings" as const },
];

export default function PayrollOverviewPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const employees = React.useMemo(() => listEmployees(), []);
  const runs = React.useMemo(() => listPayRuns(), []);

  const draftRuns = runs.filter((r) => r.status === "DRAFT" || r.status === "SUBMITTED");
  const totalGross = runs.length ? runs.reduce((s, r) => s + r.totalGross, 0) : 0;

  return (
    <PageShell>
      <PageHeader
        title="Payroll"
        description="Employees, pay runs, payslips, Kenya statutories"
        breadcrumbs={[{ label: "Payroll" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => openWithPrompt("Explain payroll variance MoM. Summarize project burn vs budget.")}>
            <Icons.Sparkles className="mr-2 h-4 w-4" />
            Ask Copilot
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick stats</span>
          <ExplainThis prompt="Explain payroll and Kenya statutories (NSSF, NHIF, PAYE)." label="Explain payroll" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Icons.Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pay runs</CardTitle>
              <Icons.CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{runs.length}</div>
              <p className="text-xs text-muted-foreground">{draftRuns.length} draft / pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total gross</CardTitle>
              <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalGross, "KES")}</div>
              <p className="text-xs text-muted-foreground">All runs</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Circle) as React.ComponentType<{ className?: string }>;
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
