"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchEmployeesApi, fetchPayRunsApi } from "@/lib/api/payroll";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/payroll/employees", label: "Employees", desc: "Full-time & consultants, KE & UG", icon: "Users" as const },
  { href: "/payroll/pay-runs", label: "Pay runs", desc: "Auto-calculate taxes, approve, post", icon: "CreditCard" as const },
  { href: "/payroll/payslips", label: "Payslips", desc: "Preview, download PDF", icon: "FileText" as const },
  { href: "/payroll/statutories", label: "Statutory rates", desc: "KE PAYE/NSSF/SHIF/AHL + UG", icon: "ShieldCheck" as const },
  { href: "/payroll/leave/requests", label: "Leave requests", desc: "Approve, reject, manage", icon: "CalendarDays" as const },
  { href: "/payroll/leave/balances", label: "Leave balances", desc: "Annual remaining per employee", icon: "BarChart2" as const },
  { href: "/payroll/leave/calendar", label: "Leave calendar", desc: "Monthly approved leaves view", icon: "CalendarRange" as const },
  { href: "/payroll/leave/policies", label: "Leave policies", desc: "Statutory + extra entitlements", icon: "ClipboardList" as const },
  { href: "/settings/payroll", label: "Payroll settings", desc: "Jurisdiction, currency, pay period", icon: "Settings" as const },
];

export default function PayrollOverviewPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [employees, setEmployees] = React.useState<Awaited<ReturnType<typeof fetchEmployeesApi>>>([]);
  const [runs, setRuns] = React.useState<Awaited<ReturnType<typeof fetchPayRunsApi>>>([]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [employeeRows, runRows] = await Promise.all([
          fetchEmployeesApi(),
          fetchPayRunsApi(),
        ]);
        if (cancelled) return;
        setEmployees(employeeRows);
        setRuns(runRows);
      } catch {
        // Keep the overview resilient; linked detail pages surface exact API errors.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const draftRuns = runs.filter((r) => r.status === "DRAFT" || r.status === "SUBMITTED");
  const totalGross = runs.length ? runs.reduce((s, r) => s + r.totalGross, 0) : 0;

  return (
    <PageShell>
      <PageHeader
        title="Payroll"
        description="Kenya & Uganda payroll — employees, auto-tax calculations, pay runs, leave management."
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
