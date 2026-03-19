"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculatePayRunLinesApi,
  createPayRunApi,
  fetchEmployeesApi,
  fetchPayRunsApi,
  submitPayRunForApprovalApi,
} from "@/lib/api/payroll";
import { downloadCsv } from "@/lib/export/csv";
import type { CalculatedLine, Employee, PayRun } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "APPROVED" || s === "PROCESSED") return "secondary";
  if (s === "DRAFT" || s === "SUBMITTED") return "outline";
  return "default";
}

function fmt(n: number, currency: string) {
  return formatMoney(n, currency);
}

export default function PayRunsPage() {
  const router = useRouter();
  const branches = useAuthStore((state) => state.branches);
  const currentBranch = useAuthStore((state) => state.currentBranch);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [month, setMonth] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [currency, setCurrency] = React.useState("KES");
  const [loading, setLoading] = React.useState(true);
  const [calculating, setCalculating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [runs, setRuns] = React.useState<PayRun[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [calculatedLines, setCalculatedLines] = React.useState<CalculatedLine[] | null>(null);
  const [expandedLineId, setExpandedLineId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const d = new Date();
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  React.useEffect(() => {
    if (!branchId) {
      setBranchId(currentBranch?.branchId ?? branches[0]?.branchId ?? "");
    }
  }, [branchId, branches, currentBranch]);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [payRuns, payrollEmployees] = await Promise.all([
        fetchPayRunsApi(),
        fetchEmployeesApi(),
      ]);
      setRuns(payRuns);
      setEmployees(payrollEmployees);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refreshData(); }, [refreshData]);

  const branchNameById = React.useMemo(
    () => new Map(branches.map((branch) => [branch.branchId, branch.name])),
    [branches]
  );

  const filteredEmployees = employees.filter((e) => !branchId || e.branch === branchId);

  const handleAutoCalculate = async () => {
    if (!month || !filteredEmployees.length) {
      toast.info("Select a month and ensure employees exist for the branch.");
      return;
    }
    setCalculating(true);
    try {
      const lines = await calculatePayRunLinesApi({
        periodStart: `${month}-01`,
        employees: filteredEmployees.map((e) => ({
          employeeId: e.id,
          grossPay: e.baseSalary > 0 ? e.baseSalary : (e.contractDailyRate ? e.contractDailyRate * 20 : 0),
        })),
      });
      setCalculatedLines(lines);
      if (lines.length > 0) {
        setCurrency(lines[0].currency ?? "KES");
      }
      toast.success(`Calculated taxes for ${lines.length} employee(s).`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCalculating(false);
    }
  };

  const summaryLines = calculatedLines ?? [];
  const totalGross = summaryLines.reduce((s, l) => s + l.grossPay, 0);
  const totalNet = summaryLines.reduce((s, l) => s + l.netPay, 0);
  const totalDeductions = summaryLines.reduce((s, l) => s + l.totalEmployeeDeductions, 0);
  const totalEmployerNssf = summaryLines.reduce((s, l) => s + l.totalEmployerCost, 0);

  const handleCreate = async (andSubmit = false) => {
    if (!month) { toast.info("Select month."); return; }
    if (!summaryLines.length) { toast.info("Click Auto-calculate taxes first."); return; }
    setSaving(true);
    try {
      const payload = {
        periodStart: `${month}-01`,
        periodEnd: `${month}-31`,
        branchId,
        currency,
        lines: summaryLines.map((l) => ({
          employeeId: l.employeeId,
          grossPay: l.grossPay,
          deductions: l.totalEmployeeDeductions,
          statBreakdown: l.statBreakdown,
          employmentType: l.employmentType,
          taxCountry: l.taxCountry,
        })),
      };
      const created = await createPayRunApi(payload);
      if (andSubmit) await submitPayRunForApprovalApi(created.id);
      setCreateOpen(false);
      setCalculatedLines(null);
      await refreshData();
      toast.success(andSubmit ? "Pay run created and sent for approval." : "Pay run created.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: PayRun) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "month", header: "Month", accessor: "month" as keyof PayRun },
      {
        id: "branch",
        header: "Branch",
        accessor: (r: PayRun) => branchNameById.get(r.branch ?? "") ?? r.branch ?? "—",
      },
      { id: "totalGross", header: "Gross", accessor: (r: PayRun) => formatMoney(r.totalGross, r.currency) },
      { id: "totalNet", header: "Net", accessor: (r: PayRun) => formatMoney(r.totalNet, r.currency) },
      {
        id: "employerNssf",
        header: "Employer NSSF",
        accessor: (r: PayRun) => r.totalEmployerNssf ? formatMoney(r.totalEmployerNssf, r.currency) : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PayRun) => (
          <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>
        ),
      },
    ],
    [branchNameById]
  );

  return (
    <PageShell>
      <PageHeader
        title="Pay runs"
        description="Create a pay run with auto-calculated Kenya & Uganda statutory deductions."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Pay runs" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain pay run flow, PAYE, NSSF, SHIF, AHL for Kenya and Uganda payroll." label="Explain" />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New pay run
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search runs..."
          onExport={() =>
            downloadCsv(
              `pay-runs-${new Date().toISOString().slice(0, 10)}.csv`,
              runs.map((run) => ({
                number: run.number,
                month: run.month,
                branch: run.branch ?? "",
                currency: run.currency,
                status: run.status,
                totalGross: run.totalGross,
                totalNet: run.totalNet,
              }))
            )
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Pay runs</CardTitle>
            <CardDescription>Statutory taxes auto-calculated per jurisdiction. Click a run to view / approve / post.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<PayRun>
              data={runs}
              columns={columns}
              onRowClick={(r) => router.push(`/payroll/pay-runs/${r.id}`)}
              emptyMessage={loading ? "Loading pay runs..." : "No pay runs yet."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCalculatedLines(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New pay run</SheetTitle>
            <SheetDescription>
              Select month and branch, then auto-calculate statutory deductions for all employees.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-payrun-month">Month</Label>
                <Input id="create-payrun-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={(v) => { setBranchId(v); setCalculatedLines(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.branchId} value={b.branchId}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <Icons.Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredEmployees.length} employee(s) in selected branch
              </span>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAutoCalculate}
                  disabled={calculating || !filteredEmployees.length}
                >
                  {calculating ? (
                    <Icons.Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icons.Calculator className="mr-2 h-3.5 w-3.5" />
                  )}
                  Auto-calculate taxes
                </Button>
              </div>
            </div>

            {calculatedLines && calculatedLines.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Tax breakdown per employee</p>
                <div className="divide-y rounded-lg border text-sm">
                  {calculatedLines.map((line) => (
                    <div key={line.employeeId} className="p-3">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => setExpandedLineId(expandedLineId === line.employeeId ? null : line.employeeId)}
                      >
                        <div className="flex-1">
                          <span className="font-medium">{line.employeeName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {line.employmentType === "CONSULTANT" ? "Consultant" : "Full-time"} · {line.taxCountry}
                          </span>
                        </div>
                        <span className="text-muted-foreground">{fmt(line.grossPay, line.currency)}</span>
                        <span className="text-red-500">−{fmt(line.totalEmployeeDeductions, line.currency)}</span>
                        <span className="font-semibold text-green-600">{fmt(line.netPay, line.currency)}</span>
                        <Icons.ChevronDown className={`h-4 w-4 transition-transform ${expandedLineId === line.employeeId ? "rotate-180" : ""}`} />
                      </div>
                      {expandedLineId === line.employeeId && (
                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                          {line.statBreakdown.paye > 0 && (
                            <><span>PAYE</span><span className="text-right">{fmt(line.statBreakdown.paye, line.currency)}</span></>
                          )}
                          {line.statBreakdown.nssfEmployee > 0 && (
                            <><span>NSSF (employee)</span><span className="text-right">{fmt(line.statBreakdown.nssfEmployee, line.currency)}</span></>
                          )}
                          {line.statBreakdown.nssfEmployer > 0 && (
                            <><span className="text-amber-600">NSSF (employer cost)</span><span className="text-right text-amber-600">{fmt(line.statBreakdown.nssfEmployer, line.currency)}</span></>
                          )}
                          {line.statBreakdown.shif > 0 && (
                            <><span>SHIF</span><span className="text-right">{fmt(line.statBreakdown.shif, line.currency)}</span></>
                          )}
                          {line.statBreakdown.ahl > 0 && (
                            <><span>AHL</span><span className="text-right">{fmt(line.statBreakdown.ahl, line.currency)}</span></>
                          )}
                          {line.statBreakdown.lst > 0 && (
                            <><span>LST</span><span className="text-right">{fmt(line.statBreakdown.lst, line.currency)}</span></>
                          )}
                          {line.statBreakdown.wht > 0 && (
                            <><span>WHT</span><span className="text-right">{fmt(line.statBreakdown.wht, line.currency)}</span></>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-muted/60 p-3 grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Total gross</span>
                  <span className="text-right font-medium">{fmt(totalGross, currency)}</span>
                  <span className="text-muted-foreground">Total employee deductions</span>
                  <span className="text-right text-red-500">{fmt(totalDeductions, currency)}</span>
                  <span className="text-muted-foreground">Total net pay</span>
                  <span className="text-right font-semibold text-green-600">{fmt(totalNet, currency)}</span>
                  <span className="text-muted-foreground text-amber-600">Total employer NSSF</span>
                  <span className="text-right text-amber-600">{fmt(totalEmployerNssf, currency)}</span>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="mt-6 flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCalculatedLines(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => handleCreate(false)}
              disabled={saving || !calculatedLines?.length}
            >
              {saving && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create draft
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCreate(true)}
              disabled={saving || !calculatedLines?.length}
            >
              Create &amp; request approval
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
