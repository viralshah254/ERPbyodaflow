"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMockPutaway, type PutawayGRNRow } from "@/lib/mock/warehouse/putaway";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PutawayPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  const allRows = React.useMemo(() => getMockPutaway(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.grnNumber.toLowerCase().includes(q) ||
        r.warehouse.toLowerCase().includes(q) ||
        (r.poRef?.toLowerCase().includes(q))
    );
  }, [allRows, search]);

  const columns = React.useMemo(
    () => [
      { id: "grnNumber", header: "GRN", accessor: (r: PutawayGRNRow) => <span className="font-medium">{r.grnNumber}</span>, sticky: true },
      { id: "date", header: "Date", accessor: "date" as keyof PutawayGRNRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof PutawayGRNRow },
      { id: "poRef", header: "PO Ref", accessor: "poRef" as keyof PutawayGRNRow },
      {
        id: "lines",
        header: "Lines",
        accessor: (r: PutawayGRNRow) => r.lines.length,
      },
      {
        id: "progress",
        header: "Putaway",
        accessor: (r: PutawayGRNRow) => {
          const total = r.lines.reduce((s, l) => s + l.receivedQty, 0);
          const done = r.lines.reduce((s, l) => s + l.putawayQty, 0);
          return total ? `${done}/${total}` : "—";
        },
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Putaway"
        description="GRNs awaiting putaway — allocate to bins"
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Putaway" },
        ]}
        sticky
        showCommandHint
        actions={
          <ExplainThis prompt="Explain putaway and bin allocation." label="Explain putaway" />
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by GRN, warehouse, PO..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => toast.info("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Awaiting putaway</CardTitle>
            <CardDescription>Allocate received qty to bins (UI only). Click row to allocate.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<PutawayGRNRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/putaway/${row.id}`)}
              emptyMessage="No GRNs awaiting putaway."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
