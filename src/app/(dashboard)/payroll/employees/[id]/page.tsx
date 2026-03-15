"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchEmployeeByIdApi, fetchPayrollStatutoriesApi } from "@/lib/api/payroll";
import type { Employee } from "@/lib/payroll/types";
import type { StatutoryConfig } from "@/lib/mock/payroll/statutories";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function PayrollEmployeeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [statutories, setStatutories] = React.useState<StatutoryConfig[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const [employeeItem, statutoryItems] = await Promise.all([
          fetchEmployeeByIdApi(id),
          fetchPayrollStatutoriesApi(),
        ]);
        if (!cancelled) {
          setEmployee(employeeItem);
          setStatutories(statutoryItems);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load employee details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <PageHeader title="Employee details" breadcrumbs={[{ label: "Payroll", href: "/payroll/overview" }, { label: "Employees", href: "/payroll/employees" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading employee...</div>
      </PageShell>
    );
  }

  if (!employee) {
    return (
      <PageShell>
        <PageHeader title="Employee not found" breadcrumbs={[{ label: "Payroll", href: "/payroll/overview" }, { label: "Employees", href: "/payroll/employees" }, { label: id }]} />
        <div className="p-6">
          <p className="text-sm text-muted-foreground">No employee record was found for this id.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/payroll/employees">Back to employees</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={employee.name}
        description="Employee payroll profile, statutory context, and compensation setup."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Employees", href: "/payroll/employees" },
          { label: employee.name },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/payroll/employees">Back to employees</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employment profile</CardTitle>
            <CardDescription>Branch, role, and payroll basis for this employee.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Department:</span> {employee.department ?? "Not set"}</p>
            <p><span className="text-muted-foreground">Role:</span> {employee.role ?? "Not set"}</p>
            <p><span className="text-muted-foreground">Branch:</span> {employee.branch ?? "Not set"}</p>
            <p><span className="text-muted-foreground">Employment type:</span> {employee.employmentType}</p>
            <p><span className="text-muted-foreground">Salary type:</span> {employee.salaryType}</p>
            <p><span className="text-muted-foreground">Base salary:</span> {formatMoney(employee.baseSalary, employee.currency)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statutory context</CardTitle>
            <CardDescription>Global statutory definitions currently active in payroll settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {statutories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No statutory configuration found.</p>
            ) : (
              statutories.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.code}
                      {item.rate !== undefined ? ` · ${item.rate}%` : ""}
                      {item.cap !== undefined ? ` · Cap ${formatMoney(item.cap, item.currency)}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary">{item.currency}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank and payout readiness</CardTitle>
            <CardDescription>Employee bank and beneficiary fields are managed through payroll employee updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This profile is live and connected to payroll runs. Add bank-specific attributes in the employee update flow before bulk payout processing.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
