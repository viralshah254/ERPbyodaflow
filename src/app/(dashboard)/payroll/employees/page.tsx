"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEmployeeApi, fetchEmployeesApi } from "@/lib/api/payroll";
import {
  PAYROLL_DEPARTMENTS,
  PAYROLL_FORM_EMPTY_VALUE,
  PAYROLL_JOB_TITLE_GROUPS,
} from "@/lib/payroll/employee-form-options";
import type { Employee, EmploymentType, ConsultantResidency, TaxCountry } from "@/lib/payroll/types";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { downloadCsv } from "@/lib/export/csv";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PayrollEmployeesPage() {
  const branches = useAuthStore((state) => state.branches);
  const currentBranch = useAuthStore((state) => state.currentBranch);
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Form state
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("FULL_TIME");
  const [taxCountry, setTaxCountry] = React.useState<TaxCountry>("KE");
  const [taxId, setTaxId] = React.useState("");
  const [nssfNumber, setNssfNumber] = React.useState("");
  const [shifNumber, setShifNumber] = React.useState("");
  const [residency, setResidency] = React.useState<ConsultantResidency>("RESIDENT");
  const [baseSalary, setBaseSalary] = React.useState(0);
  const [contractDailyRate, setContractDailyRate] = React.useState(0);
  const [hourlyCostRate, setHourlyCostRate] = React.useState(0);
  const [currency, setCurrency] = React.useState("KES");

  const [rows, setRows] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const refreshRows = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchEmployeesApi());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refreshRows(); }, [refreshRows]);

  React.useEffect(() => {
    if (!branchId) {
      setBranchId(currentBranch?.branchId ?? branches[0]?.branchId ?? "");
    }
  }, [branchId, branches, currentBranch]);

  React.useEffect(() => {
    setCurrency(taxCountry === "UG" ? "UGX" : "KES");
  }, [taxCountry]);

  const branchNameById = React.useMemo(
    () => new Map(branches.map((b) => [b.branchId, b.name])),
    [branches]
  );

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.department?.toLowerCase().includes(q)) ||
        (branchNameById.get(r.branch ?? "") ?? r.branch ?? "").toLowerCase().includes(q)
    );
  }, [branchNameById, rows, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r: Employee) => (
          <Link href={`/payroll/employees/${r.id}`} className="font-medium text-primary hover:underline">
            {r.name}
          </Link>
        ),
        sticky: true,
      },
      { id: "department", header: "Department", accessor: (r: Employee) => r.department ?? "—" },
      { id: "role", header: "Role / Title", accessor: (r: Employee) => r.role ?? "—" },
      {
        id: "type",
        header: "Type",
        accessor: (r: Employee) => (
          <Badge
            variant={r.employmentType === "CONSULTANT" ? "outline" : "secondary"}
            className="text-xs"
          >
            {r.employmentType === "FULL_TIME"
              ? "Full-time"
              : r.employmentType === "CASUAL"
                ? "Casual"
                : "Consultant"}
          </Badge>
        ),
      },
      {
        id: "taxCountry",
        header: "Country",
        accessor: (r: Employee) => (
          <span className="text-xs font-medium">{r.taxCountry === "UG" ? "🇺🇬 UG" : "🇰🇪 KE"}</span>
        ),
      },
      {
        id: "branch",
        header: "Branch",
        accessor: (r: Employee) => branchNameById.get(r.branch ?? "") ?? r.branch ?? "—",
      },
      {
        id: "baseSalary",
        header: "Monthly gross / fee",
        accessor: (r: Employee) =>
          r.employmentType === "CONSULTANT" && r.contractDailyRate
            ? `${formatMoney(r.contractDailyRate, r.currency)}/day`
            : formatMoney(r.baseSalary, r.currency),
      },
    ],
    [branchNameById]
  );

  const resetForm = () => {
    setFirstName(""); setLastName(""); setDepartment(""); setJobTitle("");
    setTaxId(""); setNssfNumber(""); setShifNumber("");
    setBaseSalary(0); setContractDailyRate(0); setHourlyCostRate(0);
    setEmploymentType("FULL_TIME"); setTaxCountry("KE"); setResidency("RESIDENT");
  };

  const handleCreate = async () => {
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    setSaving(true);
    try {
      await createEmployeeApi({
        firstName: firstName.trim(),
        lastName: lastName.trim() || "-",
        department: department || undefined,
        jobTitle: jobTitle || undefined,
        branch: branchId || undefined,
        baseSalary: baseSalary || 0,
        hourlyCostRate: hourlyCostRate || undefined,
        contractDailyRate: employmentType === "CONSULTANT" ? (contractDailyRate || undefined) : undefined,
        currency,
        employmentType,
        taxCountry,
        taxId: taxId || undefined,
        nssfNumber: nssfNumber || undefined,
        shifNumber: taxCountry === "KE" ? (shifNumber || undefined) : undefined,
        residency: employmentType === "CONSULTANT" ? residency : undefined,
      });
      setSheetOpen(false);
      resetForm();
      await refreshRows();
      toast.success("Employee created.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Employees"
        description="Personal, job, compensation, and statutory setup for Kenya & Uganda payroll. Monthly gross is the contract amount; pay runs prorate pay when someone joins or leaves mid-month."
        breadcrumbs={[
          { label: "Payroll", href: "/payroll/overview" },
          { label: "Employees" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain employee payroll fields and statutory deductions for Kenya and Uganda." label="Explain" />
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add employee
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/payroll/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar className="shrink-0"
          searchPlaceholder="Search by name, department, branch..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `payroll-employees-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                name: row.name,
                department: row.department ?? "",
                employmentType: row.employmentType,
                taxCountry: row.taxCountry,
                taxId: row.taxId ?? "",
                baseSalary: row.baseSalary,
                currency: row.currency,
              }))
            )
          }
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Employees</h3>
            <p className="text-xs text-muted-foreground">Full-time employees and consultants across Kenya and Uganda operations.</p>
          </div>
          <DataTable<Employee>
              data={filtered}
              columns={columns}
              emptyMessage={loading ? "Loading employees..." : "No employees found."}
              scrollMode="fill"
              size="comfortable"
              className="min-h-0 flex-1 border-0"
              />
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add employee</SheetTitle>
            <SheetDescription>Set up personal profile, employment type, and statutory tax details.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 py-5">

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-first-name">First name *</Label>
                <Input id="emp-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-last-name">Last name</Label>
                <Input id="emp-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Wanjiku" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-department">Department</Label>
                <Select
                  value={department === "" ? PAYROLL_FORM_EMPTY_VALUE : department}
                  onValueChange={(v) => setDepartment(v === PAYROLL_FORM_EMPTY_VALUE ? "" : v)}
                >
                  <SelectTrigger id="emp-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PAYROLL_FORM_EMPTY_VALUE}>— Not specified —</SelectItem>
                    {PAYROLL_DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-job-title">Job title</Label>
                <Select
                  value={jobTitle === "" ? PAYROLL_FORM_EMPTY_VALUE : jobTitle}
                  onValueChange={(v) => setJobTitle(v === PAYROLL_FORM_EMPTY_VALUE ? "" : v)}
                >
                  <SelectTrigger id="emp-job-title">
                    <SelectValue placeholder="Select job title" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(320px,70vh)]">
                    <SelectItem value={PAYROLL_FORM_EMPTY_VALUE}>— Not specified —</SelectItem>
                    {PAYROLL_JOB_TITLE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs">{group.label}</SelectLabel>
                        {group.titles.map((t) => (
                          <SelectItem key={`${group.label}-${t}`} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-branch">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="emp-branch"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.branchId} value={b.branchId}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employment type + country */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emp-type">Employment type</Label>
                <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                  <SelectTrigger id="emp-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full-time employee</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant / Contractor</SelectItem>
                    <SelectItem value="CASUAL">Casual (manual deductions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-country">Tax jurisdiction</Label>
                <Select value={taxCountry} onValueChange={(v) => setTaxCountry(v as TaxCountry)}>
                  <SelectTrigger id="emp-country"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KE">🇰🇪 Kenya</SelectItem>
                    <SelectItem value="UG">🇺🇬 Uganda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Consultant: residency */}
            {employmentType === "CONSULTANT" && (
              <div className="space-y-1.5">
                <Label htmlFor="emp-residency">Residency status (WHT rate)</Label>
                <Select value={residency} onValueChange={(v) => setResidency(v as ConsultantResidency)}>
                  <SelectTrigger id="emp-residency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIDENT">Resident — {taxCountry === "KE" ? "5% WHT" : "6% WHT"}</SelectItem>
                    {taxCountry === "KE" && (
                      <SelectItem value="EAC_NON_RESIDENT">EAC Non-Resident — 15% WHT</SelectItem>
                    )}
                    <SelectItem value="NON_RESIDENT">Non-Resident — {taxCountry === "KE" ? "20% WHT" : "15% WHT"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tax IDs */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-tax-id">
                {taxCountry === "KE" ? "KRA PIN" : "URA TIN"}
              </Label>
              <Input
                id="emp-tax-id"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={taxCountry === "KE" ? "A123456789Z" : "1234567890"}
              />
            </div>

            {employmentType === "FULL_TIME" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-nssf">NSSF number</Label>
                  <Input id="emp-nssf" value={nssfNumber} onChange={(e) => setNssfNumber(e.target.value)} placeholder="NSSF member no." />
                </div>
                {taxCountry === "KE" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-shif">SHIF number</Label>
                    <Input id="emp-shif" value={shifNumber} onChange={(e) => setShifNumber(e.target.value)} placeholder="SHIF member no." />
                  </div>
                )}
              </div>
            )}

            {/* Compensation */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3 text-muted-foreground">Compensation</p>
              {employmentType === "FULL_TIME" || employmentType === "CASUAL" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="emp-salary">
                    {employmentType === "CASUAL" ? "Gross pay for period (" : "Monthly gross salary ("}
                    {currency})
                  </Label>
                  <Input
                    id="emp-salary"
                    type="number"
                    min={0}
                    value={baseSalary || ""}
                    onChange={(e) => setBaseSalary(Number((e.target as HTMLInputElement).value) || 0)}
                    placeholder="e.g. 85000"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="emp-daily-rate">Daily / consulting rate ({currency})</Label>
                  <Input
                    id="emp-daily-rate"
                    type="number"
                    min={0}
                    value={contractDailyRate || ""}
                    onChange={(e) => setContractDailyRate(Number((e.target as HTMLInputElement).value) || 0)}
                    placeholder="e.g. 25000"
                  />
                </div>
              )}
              <div className="space-y-1.5 mt-3">
                <Label htmlFor="emp-hourly-cost">Hourly cost override ({currency}) — optional</Label>
                <Input
                  id="emp-hourly-cost"
                  type="number"
                  min={0}
                  value={hourlyCostRate || ""}
                  onChange={(e) => setHourlyCostRate(Number((e.target as HTMLInputElement).value) || 0)}
                  placeholder="For project costing"
                />
              </div>
            </div>

          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setSheetOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
