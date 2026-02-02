"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMockProjects, type ProjectRow, type ProjectStatus } from "@/lib/mock/projects/list";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
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

  const allRows = React.useMemo(() => getMockProjects(), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
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
  }, [allRows, search, statusFilter]);

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
            <Button size="sm" onClick={() => window.alert("Create project (stub). API pending.")}>
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
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Code, name, client, start/end, status, budget, cost center. Attach docs (bills, journals, expenses).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<ProjectRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/projects/${row.id}`)}
              emptyMessage="No projects."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
