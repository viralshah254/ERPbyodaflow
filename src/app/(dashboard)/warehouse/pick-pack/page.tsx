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
import { getMockPickPack, type PickPackOrderRow, type PickPackStatus } from "@/lib/mock/warehouse/pick-pack";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pick", value: "PICK" },
  { label: "Pack", value: "PACK" },
  { label: "Dispatch", value: "DISPATCH" },
];

function statusVariant(s: PickPackStatus): "default" | "secondary" | "outline" {
  if (s === "DISPATCH") return "secondary";
  if (s === "PICK") return "default";
  return "outline";
}

export default function PickPackPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const allRows = React.useMemo(() => getMockPickPack(), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          (r.customer?.toLowerCase().includes(q)) ||
          r.warehouse.toLowerCase().includes(q)
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return out;
  }, [allRows, search, statusFilter]);

  const columns = React.useMemo(
    () => [
      { id: "reference", header: "Reference", accessor: (r: PickPackOrderRow) => <span className="font-medium">{r.reference}</span>, sticky: true },
      { id: "type", header: "Type", accessor: (r: PickPackOrderRow) => r.type === "delivery" ? "Delivery" : "Sales order" },
      { id: "customer", header: "Customer", accessor: "customer" as keyof PickPackOrderRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof PickPackOrderRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: PickPackOrderRow) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      { id: "lines", header: "Lines", accessor: (r: PickPackOrderRow) => r.lines.length },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Pick & Pack"
        description="Fulfill deliveries and sales orders"
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack" },
        ]}
        sticky
        showCommandHint
        actions={
          <ExplainThis prompt="Explain pick/pack/putaway workflow." label="Explain pick-pack" />
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by reference, customer..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: (v) => setStatusFilter(v) },
          ]}
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Open orders</CardTitle>
            <CardDescription>Picklist → Pack → Dispatch. Click row to view.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<PickPackOrderRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/pick-pack/${row.id}`)}
              emptyMessage="No orders needing fulfillment."
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
