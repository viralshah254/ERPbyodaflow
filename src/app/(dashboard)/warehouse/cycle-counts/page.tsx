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
import { listCycleCounts, createCycleCountSession } from "@/lib/data/cycle-counts.repo";
import type { CycleCountSessionRow, CycleCountStatus } from "@/lib/mock/warehouse/cycle-counts";
import { getMockWarehouses } from "@/lib/mock/masters";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Review", value: "REVIEW" },
  { label: "Posted", value: "POSTED" },
];

function statusVariant(s: CycleCountStatus): "default" | "secondary" | "outline" {
  if (s === "POSTED") return "secondary";
  if (s === "OPEN" || s === "IN_PROGRESS") return "default";
  return "outline";
}

export default function CycleCountsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    warehouseId: "",
    scope: "bin" as "bin" | "category" | "full",
    scopeDetail: "",
  });

  const warehouses = React.useMemo(() => getMockWarehouses(), []);
  const [allRows, setAllRows] = React.useState<CycleCountSessionRow[]>(() => listCycleCounts());
  const refresh = React.useCallback(() => setAllRows(listCycleCounts()), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.warehouse.toLowerCase().includes(q) ||
          (r.scopeDetail?.toLowerCase().includes(q))
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return out;
  }, [allRows, search, statusFilter]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: CycleCountSessionRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof CycleCountSessionRow },
      { id: "scope", header: "Scope", accessor: (r: CycleCountSessionRow) => `${r.scope}${r.scopeDetail ? ` · ${r.scopeDetail}` : ""}` },
      {
        id: "status",
        header: "Status",
        accessor: (r: CycleCountSessionRow) => <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>,
      },
      { id: "lines", header: "Lines", accessor: (r: CycleCountSessionRow) => r.lines.length },
    ],
    []
  );

  const openCreate = () => {
    setForm({ warehouseId: warehouses[0]?.id ?? "", scope: "bin", scopeDetail: "" });
    setCreateOpen(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Cycle counts"
        description="Count sessions, variance, post adjustments"
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Cycle counts" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Suggest cycle count schedule. Explain variance and post adjustments." label="Explain cycle counts" />
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create session
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, warehouse..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { id: "status", label: "Status", options: STATUS_OPTIONS, value: statusFilter, onChange: (v) => setStatusFilter(v) },
          ]}
          onExport={() => toast.info("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Create by bin/category. Scan or enter quantities. Post adjustments (stub).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<CycleCountSessionRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/cycle-counts/${row.id}`)}
              emptyMessage="No cycle count sessions."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create cycle count session</SheetTitle>
            <SheetDescription>Saved to browser storage. API pending.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={(v) => setForm((p) => ({ ...p, warehouseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v: "bin" | "category" | "full") => setForm((p) => ({ ...p, scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bin">Bin</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope detail (e.g. Zone A, Category X)</Label>
              <Input value={form.scopeDetail} onChange={(e) => setForm((p) => ({ ...p, scopeDetail: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const wh = warehouses.find((w) => w.id === form.warehouseId);
                if (!wh) {
                  toast.error("Select a warehouse.");
                  return;
                }
                createCycleCountSession({
                  warehouse: wh.name,
                  scope: form.scope,
                  scopeDetail: form.scopeDetail || undefined,
                });
                toast.success("Cycle count session created.");
                setCreateOpen(false);
                refresh();
              }}
            >
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
