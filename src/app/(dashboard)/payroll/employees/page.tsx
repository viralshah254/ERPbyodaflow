"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { listEmployees, createEmployee } from "@/lib/data/payroll.repo";
import type { Employee, EmploymentType, SalaryType } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

const EMPLOYMENT_TYPES: EmploymentType[] = ["PERMANENT", "CONTRACT"];
const SALARY_TYPES: SalaryType[] = ["MONTHLY", "HOURLY"];

export default function PayrollEmployeesPage() {
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [branch, setBranch] = React.useState("Head Office");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("PERMANENT");
  const [salaryType, setSalaryType] = React.useState<SalaryType>("MONTHLY");
  const [baseSalary, setBaseSalary] = React.useState(0);

  const [seed, setSeed] = React.useState(0);
  const rows = React.useMemo(() => listEmployees(), [seed]);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.department?.toLowerCase().includes(q)) ||
        (r.branch?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Name", accessor: (r: Employee) => <span className="font-medium">{r.name}</span>, sticky: true },
      { id: "department", header: "Department", accessor: (r: Employee) => r.department ?? "—" },
      { id: "role", header: "Role", accessor: (r: Employee) => r.role ?? "—" },
      { id: "branch", header: "Branch", accessor: (r: Employee) => r.branch ?? "—" },
      { id: "employmentType", header: "Type", accessor: (r: Employee) => r.employmentType },
      { id: "baseSalary", header: "Base", accessor: (r: Employee) => formatMoney(r.baseSalary, r.currency) },
    ],
    []
  );

  const handleCreate = () => {
    createEmployee({
      name: name || "New Employee",
      department: department || undefined,
      branch: branch || undefined,
      employmentType,
      salaryType,
      baseSalary: baseSalary || 0,
      currency: "KES",
      allowances: [],
      deductions: [],
    });
    setSheetOpen(false);
    setName("");
    setDepartment("");
    setBaseSalary(0);
    setSeed((s) => s + 1);
  };

  return (
    <PageShell>
      <PageHeader
        title="Employees"
        description="Personal, job, pay, bank. KRA/NHIF/NSSF stubs."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Employees" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain employee payroll fields and Kenya statutories." label="Explain" />
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create employee
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by name, department, branch..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
            <CardDescription>Name, id/passport (masked), KRA/NHIF/NSSF, department, branch, pay, bank.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<Employee>
              data={filtered}
              columns={columns}
              emptyMessage="No employees."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create employee</SheetTitle>
            <SheetDescription>Personal, job, pay. Bank & statutory stubs.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-employee-name">Name</Label>
              <Input id="create-employee-name" data-testid="create-employee-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-employee-department">Department</Label>
              <Input id="create-employee-department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Finance" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-employee-branch">Branch</Label>
              <Input id="create-employee-branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Head Office" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-employee-employment-type">Employment type</Label>
              <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                <SelectTrigger id="create-employee-employment-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-employee-salary-type">Salary type</Label>
              <Select value={salaryType} onValueChange={(v) => setSalaryType(v as SalaryType)}>
                <SelectTrigger id="create-employee-salary-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALARY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-employee-base-salary">Base salary (KES)</Label>
              <Input id="create-employee-base-salary" type="number" min={0} value={baseSalary || ""} onChange={(e) => setBaseSalary(Number((e.target as HTMLInputElement).value) || 0)} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} data-testid="create-employee-submit">Create</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
