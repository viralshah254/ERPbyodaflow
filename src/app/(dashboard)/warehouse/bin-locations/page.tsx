"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { createWarehouseLocation, fetchWarehouseLocations, updateWarehouseLocation, type WarehouseLocationRow } from "@/lib/api/warehouse-locations";
import { fetchLocationStock, type WarehouseLocationStockRow } from "@/lib/api/warehouse-execution";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BinLocationsPage() {
  const [search, setSearch] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; label: string }>>([]);
  const [rows, setRows] = React.useState<WarehouseLocationRow[]>([]);
  const [stock, setStock] = React.useState<WarehouseLocationStockRow[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WarehouseLocationRow | null>(null);
  const [form, setForm] = React.useState({ code: "", name: "", type: "BIN" as "BIN" | "ZONE" | "RACK" });

  const refresh = React.useCallback(async () => {
    if (!warehouseId) return;
    try {
      const [locations, locationStock] = await Promise.all([
        fetchWarehouseLocations(warehouseId),
        fetchLocationStock(warehouseId),
      ]);
      setRows(locations);
      setStock(locationStock);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load bin locations.");
    }
  }, [warehouseId]);

  React.useEffect(() => {
    void fetchWarehouseOptions().then((items) => {
      setWarehouses(items);
      if (!warehouseId && items[0]) setWarehouseId(items[0].id);
    });
  }, [warehouseId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const stockByLocationId = new Map<string, number>();
    for (const item of stock) {
      if (!item.locationId) continue;
      stockByLocationId.set(item.locationId, (stockByLocationId.get(item.locationId) ?? 0) + item.quantity);
    }
    const query = search.trim().toLowerCase();
    return rows
      .map((row) => ({
        ...row,
        onHand: stockByLocationId.get(row.id) ?? 0,
      }))
      .filter((row) =>
        !query ||
        [row.code, row.name, row.type].filter(Boolean).some((value) => value!.toLowerCase().includes(query))
      );
  }, [rows, stock, search]);

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (r: (typeof filtered)[number]) => <span className="font-medium">{r.code ?? "—"}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof (typeof filtered)[number] },
      { id: "type", header: "Type", accessor: "type" as keyof (typeof filtered)[number] },
      { id: "status", header: "Status", accessor: (r: (typeof filtered)[number]) => r.status ?? "ACTIVE" },
      { id: "onHand", header: "On hand", accessor: "onHand" as keyof (typeof filtered)[number] },
    ],
    [filtered]
  );

  return (
    <PageShell>
      <PageHeader
        title="Bin locations"
        description="Live bin master data plus location/bin stock visibility."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Bin locations" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={() => {
            setEditing(null);
            setForm({ code: "", name: "", type: "BIN" });
            setDrawerOpen(true);
          }}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <DataTableToolbar
          searchPlaceholder="Search by code, name, type..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: warehouses.map((warehouse) => ({ label: warehouse.label, value: warehouse.id })),
              value: warehouseId,
              onChange: setWarehouseId,
            },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Bin, zone, and rack records now use backend master data and show on-hand stock.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={filtered}
              columns={columns}
              onRowClick={(row) => {
                setEditing(row);
                setForm({ code: row.code ?? "", name: row.name, type: row.type });
                setDrawerOpen(true);
              }}
              emptyMessage={!warehouseId ? "Select a warehouse." : "No locations found."}
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit location" : "Add location"}</SheetTitle>
            <SheetDescription>Persist warehouse bin and zone metadata to the backend.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as "BIN" | "ZONE" | "RACK" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIN">BIN</SelectItem>
                  <SelectItem value="ZONE">ZONE</SelectItem>
                  <SelectItem value="RACK">RACK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!warehouseId) {
                  toast.error("Select a warehouse.");
                  return;
                }
                try {
                  if (editing) {
                    await updateWarehouseLocation(warehouseId, editing.id, {
                      code: form.code,
                      name: form.name,
                      type: form.type,
                    });
                  } else {
                    await createWarehouseLocation(warehouseId, {
                      code: form.code,
                      name: form.name,
                      type: form.type,
                    });
                  }
                  toast.success(`Location ${editing ? "updated" : "created"}.`);
                  setDrawerOpen(false);
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to save location.");
                }
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
