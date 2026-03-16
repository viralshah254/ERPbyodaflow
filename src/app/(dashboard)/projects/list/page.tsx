"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { createProjectApi, fetchProjectsApi } from "@/lib/api/projects";
import type { ProjectRow, ProjectStatus } from "@/lib/types/projects";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "On hold", value: "ON_HOLD" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function statusVariant(s: ProjectStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "COMPLETED") return "secondary";
  if (s === "CANCELLED") return "destructive";
  if (s === "ON_HOLD") return "outline";
  return "default";
}

export default function ProjectsListPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [rows, setRows] = React.useState<ProjectRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    client: "",
    startDate: "",
    endDate: "",
    budget: "",
    timesheetCostingMode: "EMPLOYEE_SALARY_MONTHLY_173" as
      | "EMPLOYEE_SALARY_MONTHLY_173"
      | "PROJECT_DEFAULT_RATE",
    defaultHourlyRate: "",
  });

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchProjectsApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q)
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return out;
  }, [rows, search, statusFilter]);

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      client: "",
      startDate: "",
      endDate: "",
      budget: "",
      timesheetCostingMode: "EMPLOYEE_SALARY_MONTHLY_173",
      defaultHourlyRate: "",
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return;
    }
    setSaving(true);
    try {
      const created = await createProjectApi({
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        client: form.client.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        status: "ACTIVE",
        timesheetCostingMode: form.timesheetCostingMode,
        defaultHourlyRate: form.defaultHourlyRate ? Number(form.defaultHourlyRate) : undefined,
      });
      resetForm();
      setDrawerOpen(false);
      await reload();
      toast.success("Project created.");
      router.push(`/projects/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (r: ProjectRow) => <span className="font-medium">{r.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof ProjectRow },
      { id: "client", header: "Client", accessor: "client" as keyof ProjectRow },
      { id: "dates", header: "Dates", accessor: (r: ProjectRow) => `${r.startDate} – ${r.endDate}` },
      { id: "budget", header: "Budget", accessor: (r: ProjectRow) => formatMoney(r.budget, "KES") },
      {
        id: "status",
        header: "Status",
        accessor: (r: ProjectRow) => <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        description="List, budget, cost center mapping"
        breadcrumbs={[
          { label: "Projects", href: "/projects/overview" },
          { label: "List" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain projects, cost centers, and linked transactions." label="Explain projects" />
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by code, name, client..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: (v) => setStatusFilter(v) },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Code, name, client, start/end, status, budget, cost center. Attach docs (bills, journals, expenses).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading projects...</div>
            ) : (
              <DataTable<ProjectRow>
                data={filtered}
                columns={columns}
                onRowClick={(row) => router.push(`/projects/${row.id}`)}
                emptyMessage="No projects."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="New project"
        description="Create a live project record."
        mode="create"
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Creating..." : "Create project"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Input value={form.client} onChange={(event) => setForm((current) => ({ ...current, client: event.target.value }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Budget</Label>
            <Input type="number" value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Timesheet costing mode</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.timesheetCostingMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timesheetCostingMode: event.target.value as
                    | "EMPLOYEE_SALARY_MONTHLY_173"
                    | "PROJECT_DEFAULT_RATE",
                }))
              }
            >
              <option value="EMPLOYEE_SALARY_MONTHLY_173">Employee salary / 173 hours</option>
              <option value="PROJECT_DEFAULT_RATE">Project default hourly rate</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Default hourly rate (KES)</Label>
            <Input
              type="number"
              value={form.defaultHourlyRate}
              onChange={(event) => setForm((current) => ({ ...current, defaultHourlyRate: event.target.value }))}
              placeholder="Used when employee salary is missing or project default mode is selected"
            />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
