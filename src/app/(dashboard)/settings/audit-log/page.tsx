"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMockAuditLog, type AuditEntry } from "@/lib/mock/audit-log";
import { format } from "date-fns";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");

  const allRows = React.useMemo(() => getMockAuditLog(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.who.toLowerCase().includes(q) ||
        r.what.toLowerCase().includes(q) ||
        r.entityType.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "when",
        header: "When",
        accessor: (r: AuditEntry) => (
          <span className="text-muted-foreground text-sm">
            {format(new Date(r.when), "MMM d, yyyy HH:mm")}
          </span>
        ),
        sticky: true,
      },
      { id: "who", header: "Who", accessor: "who" as keyof AuditEntry },
      {
        id: "what",
        header: "What",
        accessor: (r: AuditEntry) => (
          <span className="font-medium">{r.what}</span>
        ),
      },
      {
        id: "action",
        header: "Action",
        accessor: (r: AuditEntry) => (
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
            {r.action}
          </span>
        ),
      },
      {
        id: "diff",
        header: "Change",
        accessor: (r: AuditEntry) => {
          if (!r.before && !r.after) return "—";
          return (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Before / After
              </summary>
              <pre className="mt-1 rounded border bg-muted/30 p-2 overflow-auto max-w-xs">
                {JSON.stringify(
                  { before: r.before ?? null, after: r.after ?? null },
                  null,
                  2
                )}
              </pre>
            </details>
          );
        },
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Audit Log"
        description="Who did what, when. Before/after preview for changes."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Audit Log" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by user, entity, action..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => toast.info("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              {filtered.length} entries. All actions are logged for compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<AuditEntry>
              data={filtered}
              columns={columns}
              emptyMessage="No audit entries found."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
