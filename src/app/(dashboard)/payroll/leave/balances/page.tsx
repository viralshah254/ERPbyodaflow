"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchEmployeesApi,
  fetchLeaveBalancesApi,
} from "@/lib/api/payroll";
import type { Employee, LeaveBalance } from "@/lib/payroll/types";
import { toast } from "sonner";

type BalanceRow = LeaveBalance & { employeeName: string };

export default function LeaveBalancesPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(currentYear);
  const [employeeFilter, setEmployeeFilter] = React.useState("");
  const [balances, setBalances] = React.useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);

  const empMap = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [bals, emps] = await Promise.all([
        fetchLeaveBalancesApi({ year }),
        fetchEmployeesApi(),
      ]);
      setBalances(bals);
      setEmployees(emps);
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }, [year]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const rows: BalanceRow[] = React.useMemo(() => {
    return balances
      .filter((b) => !employeeFilter || b.employeeId === employeeFilter)
      .map((b) => ({ ...b, employeeName: empMap.get(b.employeeId)?.name ?? b.employeeId }));
  }, [balances, empMap, employeeFilter]);

  const columns = React.useMemo(
    () => [
      { id: "employee", header: "Employee", accessor: (r: BalanceRow) => <span className="font-medium">{r.employeeName}</span>, sticky: true },
      {
        id: "annual",
        header: "Annual leave",
        accessor: (r: BalanceRow) => (
          <div className="space-y-1 min-w-[140px]">
            <div className="flex justify-between text-xs">
              <span>{r.annualUsed}d used</span>
              <span className="text-muted-foreground">{r.annualEntitled}d entitled</span>
            </div>
            <Progress value={r.annualEntitled > 0 ? (r.annualUsed / r.annualEntitled) * 100 : 0} className="h-1.5" />
            <div className="text-xs text-green-600 font-medium">{r.annualRemaining}d remaining</div>
          </div>
        ),
      },
      { id: "sick", header: "Sick leave used", accessor: (r: BalanceRow) => `${r.sickUsed} day(s)` },
      { id: "maternity", header: "Maternity used", accessor: (r: BalanceRow) => r.maternityUsed > 0 ? `${r.maternityUsed}d` : "—" },
      { id: "paternity", header: "Paternity used", accessor: (r: BalanceRow) => r.paternityUsed > 0 ? `${r.paternityUsed}d` : "—" },
      { id: "unpaid", header: "Unpaid used", accessor: (r: BalanceRow) => r.unpaidUsed > 0 ? `${r.unpaidUsed}d` : "—" },
    ],
    []
  );

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <PageShell>
      <PageHeader
        title="Leave balances"
        description="Annual leave remaining, sick days used, and other leave breakdown per employee."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Leave", href: "/payroll/leave/requests" },
          { label: "Balances" },
        ]}
        sticky
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/requests">Requests</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/leave/calendar">Calendar</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Filter by employee</Label>
            <Select value={employeeFilter || "__all__"} onValueChange={(v) => setEmployeeFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All employees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All employees</SelectItem>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Leave balances — {year}</CardTitle>
            <CardDescription>
              {rows.length} record(s). Balances update automatically when leave is approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<BalanceRow>
              data={rows}
              columns={columns}
              emptyMessage={loading ? "Loading balances…" : "No leave balances found. Approve a leave request to initialise."}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
