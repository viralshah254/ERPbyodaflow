"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWarehouseApi,
  fetchWarehousesApi,
  mapWarehouseRow,
  updateWarehouseApi,
} from "@/lib/api/warehouses";
import { fetchBranchOptions } from "@/lib/api/lookups";
import type { WarehouseRow } from "@/lib/types/masters";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WarehousesPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<WarehouseRow[]>([]);
  const [branches, setBranches] = React.useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WarehouseRow | null>(null);
  const [form, setForm] = React.useState({ code: "", name: "", branchId: "none" });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [warehouseItems, branchItems] = await Promise.all([fetchWarehousesApi(), fetchBranchOptions()]);
      const branchNames = new Map(branchItems.map((b) => [b.id, b.label]));
      setBranches(branchItems);
      setRows(warehouseItems.map((item) => mapWarehouseRow(item, branchNames)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load warehouses.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.code, row.name, row.branch ?? "", row.status].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", branchId: "none" });
    setDrawerOpen(true);
  };

  const openEdit = (row: WarehouseRow) => {
    setEditing(row);
    const branchId = branches.find((branch) => branch.label === row.branch)?.id ?? "none";
    setForm({ code: row.code, name: row.name, branchId });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (row: WarehouseRow) => <span className="font-medium">{row.code}</span> },
      { id: "name", header: "Name", accessor: "name" as keyof WarehouseRow },
      { id: "branch", header: "Branch", accessor: (row: WarehouseRow) => row.branch || "—" },
      { id: "status", header: "Status", accessor: "status" as keyof WarehouseRow },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: WarehouseRow) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/warehouse/bin-locations">Locations</Link>
            </Button>
          </div>
        ),
      },
    ],
    [branches]
  );

  return (
    <PageShell>
      <PageHeader
        title="Warehouses & Locations"
        description="Manage warehouses and navigate to bin/location configuration."
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Warehouses" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search warehouses..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Warehouses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading warehouses...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="MapPin"
                  title="No warehouses"
                  description="Add warehouses to organize your inventory storage."
                  action={{ label: "Add Warehouse", onClick: openCreate }}
                />
              </div>
            ) : (
              <DataTable<WarehouseRow> data={filtered} columns={columns} emptyMessage="No warehouses found." />
            )}
          </CardContent>
        </Card>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-md bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? "Edit warehouse" : "Create warehouse"}</h2>
            <p className="text-sm text-muted-foreground">Configure warehouse identity and branch assignment.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="WH-MAIN" />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Main Warehouse" />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={form.branchId} onValueChange={(value) => setForm((prev) => ({ ...prev, branchId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!form.name.trim()) {
                      toast.error("Warehouse name is required.");
                      return;
                    }
                    try {
                      const payload = {
                        code: form.code.trim(),
                        name: form.name.trim(),
                        branchId: form.branchId === "none" ? undefined : form.branchId,
                      };
                      if (editing) {
                        await updateWarehouseApi(editing.id, payload);
                        toast.success("Warehouse updated.");
                      } else {
                        await createWarehouseApi(payload);
                        toast.success("Warehouse created.");
                      }
                      setDrawerOpen(false);
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to save warehouse.");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
