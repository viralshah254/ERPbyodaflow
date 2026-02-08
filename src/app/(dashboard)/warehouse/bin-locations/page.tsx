"use client";

import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listBins, createBin, updateBin } from "@/lib/data/bins.repo";
import type { BinRow } from "@/lib/mock/warehouse/bins";
import { getMockWarehouses } from "@/lib/mock/masters";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BinLocationsPage() {
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [zoneFilter, setZoneFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BinRow | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    warehouseId: "",
    zone: "",
    aisle: "",
    rack: "",
    shelf: "",
    active: true,
  });

  const warehouses = React.useMemo(() => getMockWarehouses(), []);
  const [allRows, setAllRows] = React.useState<BinRow[]>(() => listBins());
  const refresh = React.useCallback(() => setAllRows(listBins()), []);
  const filteredByWarehouseZone = React.useMemo(() => {
    let out = allRows;
    if (warehouseFilter) out = out.filter((b) => b.warehouse === warehouseFilter);
    if (zoneFilter) out = out.filter((b) => b.zone === zoneFilter);
    return out;
  }, [allRows, warehouseFilter, zoneFilter]);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return filteredByWarehouseZone;
    const q = search.trim().toLowerCase();
    return filteredByWarehouseZone.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.zone.toLowerCase().includes(q)
    );
  }, [filteredByWarehouseZone, search]);

  const zones = React.useMemo(() => Array.from(new Set(allRows.map((b) => b.zone))), [allRows]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      warehouseId: warehouses[0]?.id ?? "",
      zone: "",
      aisle: "",
      rack: "",
      shelf: "",
      active: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (r: BinRow) => {
    setEditing(r);
    setForm({
      code: r.code,
      name: r.name,
      warehouseId: r.warehouseId,
      zone: r.zone,
      aisle: r.aisle,
      rack: r.rack,
      shelf: r.shelf,
      active: r.active,
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (r: BinRow) => <span className="font-medium">{r.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof BinRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof BinRow },
      { id: "zone", header: "Zone", accessor: "zone" as keyof BinRow },
      { id: "aisle", header: "Aisle", accessor: "aisle" as keyof BinRow },
      { id: "rack", header: "Rack", accessor: "rack" as keyof BinRow },
      { id: "shelf", header: "Shelf", accessor: "shelf" as keyof BinRow },
      {
        id: "active",
        header: "Active",
        accessor: (r: BinRow) => (r.active ? "Yes" : "No"),
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Bin locations"
        description="Create and manage bins per warehouse"
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Bin locations" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain bin locations, zones, and putaway." label="Explain bins" />
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add bin
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by code, name, zone..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: [{ label: "All", value: "" }, ...warehouses.map((w) => ({ label: w.name, value: w.name }))],
              value: warehouseFilter,
              onChange: (v) => setWarehouseFilter(v),
            },
            {
              id: "zone",
              label: "Zone",
              options: [{ label: "All", value: "" }, ...zones.map((z) => ({ label: z, value: z }))],
              value: zoneFilter,
              onChange: (v) => setZoneFilter(v),
            },
          ]}
          onExport={() => toast.info("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Bins</CardTitle>
            <CardDescription>{filtered.length} bin(s).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<BinRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => openEdit(row)}
              emptyMessage="No bins. Add one."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit bin" : "Add bin"}</SheetTitle>
            <SheetDescription>Saved to browser storage. API pending.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. WH-Main-A-01-01" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Display name" />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input value={form.zone} onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Aisle</Label>
                <Input value={form.aisle} onChange={(e) => setForm((p) => ({ ...p, aisle: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rack</Label>
                <Input value={form.rack} onChange={(e) => setForm((p) => ({ ...p, rack: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Shelf</Label>
                <Input value={form.shelf} onChange={(e) => setForm((p) => ({ ...p, shelf: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={form.active} onCheckedChange={(c) => setForm((p) => ({ ...p, active: c === true }))} />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const wh = warehouses.find((w) => w.id === form.warehouseId);
                const warehouseName = wh?.name ?? "";
                if (editing) {
                  updateBin(editing.id, {
                    code: form.code,
                    name: form.name,
                    warehouseId: form.warehouseId,
                    warehouse: warehouseName,
                    zone: form.zone,
                    aisle: form.aisle,
                    rack: form.rack,
                    shelf: form.shelf,
                    active: form.active,
                  });
                  toast.success("Bin updated.");
                } else {
                  createBin({
                    code: form.code,
                    name: form.name,
                    warehouseId: form.warehouseId,
                    warehouse: warehouseName,
                    zone: form.zone,
                    aisle: form.aisle,
                    rack: form.rack,
                    shelf: form.shelf,
                    active: form.active,
                  });
                  toast.success("Bin created.");
                }
                setDrawerOpen(false);
                refresh();
              }}
            >
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
