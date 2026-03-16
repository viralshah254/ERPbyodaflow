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
  createPayRunApi,
  fetchEmployeesApi,
  fetchPayRunsApi,
  submitPayRunForApprovalApi,
} from "@/lib/api/payroll";
import { downloadCsv } from "@/lib/export/csv";
import { buildPayRunLinesFromEmployees } from "@/lib/payroll/build-pay-run-lines";
import type { PayRun } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const CURRENCIES = ["KES"];

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "APPROVED" || s === "PROCESSED") return "secondary";
  if (s === "DRAFT" || s === "SUBMITTED") return "outline";
  return "default";
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
  const [runs, setRuns] = React.useState<PayRun[]>([]);
  const [employees, setEmployees] = React.useState<Awaited<ReturnType<typeof fetchEmployeesApi>>>([]);

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

  React.useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const branchNameById = React.useMemo(
    () => new Map(branches.map((branch) => [branch.branchId, branch.name])),
    [branches]
  );

  const filteredEmployees = employees.filter((employee) => !branchId || employee.branch === branchId);
  const previewLines = month && filteredEmployees.length
    ? buildPayRunLinesFromEmployees(filteredEmployees, "preview", month)
    : [];
  const totalGross = previewLines.reduce((s, l) => s + l.gross, 0);
  const totalNet = previewLines.reduce((s, l) => s + l.net, 0);

  const createPayload = React.useMemo(
    () => ({
      periodStart: `${month}-01`,
      periodEnd: `${month}-31`,
      branchId,
      currency,
      lines: previewLines.map((line) => ({
        employeeId: line.employeeId,
        grossPay: line.gross,
        deductions: line.gross - line.net,
      })),
    }),
    [branchId, currency, month, previewLines]
  );

  const handleCreate = async () => {
    if (!month) {
      toast.info("Select month.");
      return;
    }
    try {
      await createPayRunApi(createPayload);
      setCreateOpen(false);
      await refreshData();
      toast.success("Pay run created.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRequestApproval = async () => {
    try {
      const created = await createPayRunApi(createPayload);
      await submitPayRunForApprovalApi(created.id);
      toast.success("Pay run created and sent for approval.");
      setCreateOpen(false);
      await refreshData();
    } catch (e) {
      toast.error((e as Error).message);
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
      { id: "status", header: "Status", accessor: (r: PayRun) => <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge> },
    ],
    [branchNameById]
  );

  return (
    <PageShell>
      <PageHeader
        title="Pay runs"
        description="Create run (month, branch), preview gross→statutory→net, approve, post journal, bank file."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Pay runs" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain pay run flow and statutory computation." label="Explain" />
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
            <CardTitle>Runs</CardTitle>
            <CardDescription>Month, branch, currency. Pull employees, compute gross→statutory→net.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<PayRun>
              data={runs}
              columns={columns}
              onRowClick={(r) => router.push(`/payroll/pay-runs/${r.id}`)}
              emptyMessage={loading ? "Loading pay runs..." : "No pay runs."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New pay run</SheetTitle>
            <SheetDescription>Month, branch, currency. Preview gross→statutory→net.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-payrun-month">Month</Label>
              <Input id="create-payrun-month" data-testid="create-payrun-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <p className="text-sm text-muted-foreground">
                {previewLines.length} employee(s). Gross: {formatMoney(totalGross, currency)} → Net: {formatMoney(totalNet, currency)}
              </p>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!month || previewLines.length === 0} data-testid="create-payrun-draft">
              Create draft
            </Button>
            <Button variant="outline" onClick={handleRequestApproval} disabled={!month || previewLines.length === 0} data-testid="create-payrun-request-approval">
              Request approval
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
