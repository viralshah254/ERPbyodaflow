"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { createCycleCountTask, fetchCycleCountTasks, type WarehouseCycleCountRow } from "@/lib/api/warehouse-execution";
import { fetchWarehouseLocations } from "@/lib/api/warehouse-locations";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CycleCountsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<WarehouseCycleCountRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [locations, setLocations] = React.useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [warehouseId, setWarehouseId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchCycleCountTasks();
      setRows(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load cycle counts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    void fetchWarehouseOptions().then((items) => setWarehouses(items));
  }, [refresh]);

  React.useEffect(() => {
    if (!warehouseId) {
      setLocations([]);
      setLocationId("");
      return;
    }
    void fetchWarehouseLocations(warehouseId).then((items) => setLocations(items));
  }, [warehouseId]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.number, row.warehouse, row.status].filter(Boolean).some((value) => value!.toLowerCase().includes(query))
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: WarehouseCycleCountRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "warehouse", header: "Warehouse", accessor: (r: WarehouseCycleCountRow) => r.warehouse ?? r.warehouseId ?? "—" },
      { id: "status", header: "Status", accessor: (r: WarehouseCycleCountRow) => r.status },
      { id: "lines", header: "Lines", accessor: (r: WarehouseCycleCountRow) => r.lines.length },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Cycle counts"
        description="Backend-backed count sessions with line updates and posting."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Cycle counts" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create session
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search by number or warehouse..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `cycle-counts-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((r) => ({
                number: r.number,
                warehouse: r.warehouse ?? r.warehouseId ?? "",
                status: r.status,
                lineCount: r.lines.length,
              }))
            )
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Sessions can be created by warehouse or a specific bin/location scope.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<WarehouseCycleCountRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => router.push(`/warehouse/cycle-counts/${row.id}`)}
              emptyMessage={loading ? "Loading cycle counts..." : "No cycle count sessions."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create cycle count</SheetTitle>
            <SheetDescription>Create from live warehouse or location stock.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location / bin (optional)</Label>
              <Select value={locationId || "__all__"} onValueChange={(value) => setLocationId(value === "__all__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All warehouse stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All location stock</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.code ?? location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!warehouseId) {
                  toast.error("Select a warehouse.");
                  return;
                }
                try {
                  const created = await createCycleCountTask({ warehouseId, locationId: locationId || undefined });
                  toast.success("Cycle count created.");
                  setCreateOpen(false);
                  await refresh();
                  router.push(`/warehouse/cycle-counts/${created.id}`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create cycle count.");
                }
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
