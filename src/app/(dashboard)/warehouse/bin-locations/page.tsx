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
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    type: "BIN" as "BIN" | "ZONE" | "RACK",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    parentId: "",
  });

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
            setForm({ code: "", name: "", type: "BIN", status: "ACTIVE", parentId: "" });
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
                setForm({
                  code: row.code ?? "",
                  name: row.name,
                  type: row.type,
                  status: (row.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
                  parentId: row.parentId ?? "",
                });
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
            <SheetDescription>Persist warehouse bin, rack, and zone metadata to the backend.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))} placeholder="e.g. A1-01" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. Aisle 1 Bin 01" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, type: value as "BIN" | "ZONE" | "RACK", parentId: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZONE">Zone</SelectItem>
                  <SelectItem value="RACK">Rack</SelectItem>
                  <SelectItem value="BIN">Bin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type !== "ZONE" && (
              <div className="space-y-2">
                <Label>Parent location (optional)</Label>
                <Select
                  value={form.parentId || "__none__"}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, parentId: value === "__none__" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {rows
                      .filter((row) => {
                        if (editing && row.id === editing.id) return false;
                        if (form.type === "RACK") return row.type === "ZONE";
                        if (form.type === "BIN") return row.type === "ZONE" || row.type === "RACK";
                        return false;
                      })
                      .map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.code ? `${row.code} — ${row.name}` : row.name}
                          <span className="ml-1 text-muted-foreground text-xs">({row.type})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, status: value as "ACTIVE" | "INACTIVE" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                      code: form.code || undefined,
                      name: form.name,
                      type: form.type,
                      status: form.status,
                      parentId: form.parentId || undefined,
                    });
                  } else {
                    await createWarehouseLocation(warehouseId, {
                      code: form.code || undefined,
                      name: form.name,
                      type: form.type,
                      parentId: form.parentId || undefined,
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
