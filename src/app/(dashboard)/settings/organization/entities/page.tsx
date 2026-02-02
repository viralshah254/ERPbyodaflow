"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMockEntities, type EntityRow } from "@/lib/mock/intercompany/entities";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

export default function EntitiesPage() {
  const [search, setSearch] = React.useState("");
  const rows = React.useMemo(() => getMockEntities(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (r: EntityRow) => <span className="font-medium">{r.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof EntityRow },
      { id: "baseCurrency", header: "Base currency", accessor: "baseCurrency" as keyof EntityRow },
      { id: "isReporting", header: "Reporting", accessor: (r: EntityRow) => (r.isReporting ? "Yes" : "No") },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Entities"
        description="Multi-entity setup. Base currency per entity. Intercompany accounts mapping (stub)."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Organization" },
          { label: "Entities" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain multi-entity and intercompany accounts mapping." label="Explain entities" />
            <Button size="sm" onClick={() => window.alert("Add entity (stub). API pending.")}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add entity
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/intercompany/overview">Intercompany</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by code, name..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Entities</CardTitle>
            <CardDescription>Company A, Company B. Base currency per entity. IC accounts mapping (stub).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<EntityRow>
              data={filtered}
              columns={columns}
              emptyMessage="No entities."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
