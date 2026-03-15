"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WarehouseRow } from "@/lib/mock/masters";
import { fetchBranchOptions } from "@/lib/api/lookups";
import {
  createWarehouseApi,
  fetchWarehousesApi,
  mapWarehouseRow,
  updateWarehouseApi,
} from "@/lib/api/warehouses";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function MasterWarehousesPage() {
  const terminology = useTerminology();
  const warehouseLabel = t("warehouse", terminology);

  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<WarehouseRow[]>([]);
  const [branches, setBranches] = React.useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ code: "", name: "", branchId: "none" });

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [warehouseItems, branchItems] = await Promise.all([
        fetchWarehousesApi(),
        fetchBranchOptions(),
      ]);
      const branchLabels = new Map(branchItems.map((branch) => [branch.id, branch.label]));
      setBranches(branchItems);
      setRows(warehouseItems.map((warehouse) => mapWarehouseRow(warehouse, branchLabels)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load warehouses.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.branch?.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: "", name: "", branchId: "none" });
    setDrawerOpen(true);
  };

  const openEdit = (row: WarehouseRow) => {
    setEditingId(row.id);
    const branchId = branches.find((branch) => branch.label === row.branch)?.id ?? "none";
    setForm({ code: row.code, name: row.name, branchId });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Warehouse name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        branchId: form.branchId === "none" ? undefined : form.branchId,
      };
      if (editingId) {
        await updateWarehouseApi(editingId, payload);
        toast.success(`${warehouseLabel} updated.`);
      } else {
        await createWarehouseApi(payload);
        toast.success(`${warehouseLabel} created.`);
      }
      setDrawerOpen(false);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${warehouseLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "code",
        header: "Code",
        accessor: (r: WarehouseRow) => <span className="font-medium">{r.code}</span>,
        sticky: true,
      },
      { id: "name", header: "Name", accessor: "name" as keyof WarehouseRow },
      { id: "branch", header: "Branch", accessor: "branch" as keyof WarehouseRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: WarehouseRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title={warehouseLabel + "s"}
        description="Manage warehouses and locations"
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: warehouseLabel + "s" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button
            onClick={openCreate}
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add {warehouseLabel}
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder={`Search by code, name, branch...`}
          searchValue={search}
          onSearchChange={setSearch}
          actions={
            <Link
              href="/settings/customizer/fields"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Custom fields
            </Link>
          }
        />
        {!loading && filtered.length === 0 ? (
          <EmptyState
            icon="MapPin"
            title={`No ${warehouseLabel.toLowerCase()}s`}
            description="Add your first warehouse."
            action={{
              label: `Add ${warehouseLabel}`,
              onClick: openCreate,
            }}
          />
        ) : (
          <DataTable<WarehouseRow>
            data={filtered}
            columns={columns}
            onRowClick={openEdit}
            emptyMessage={`No ${warehouseLabel.toLowerCase()}s.`}
          />
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? `Edit ${warehouseLabel}` : `New ${warehouseLabel}`}
        description={editingId ? "Update warehouse details." : "Add a new warehouse."}
        mode={editingId ? "edit" : "create"}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              placeholder="e.g. WH-Main"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Warehouse name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={form.branchId}
              onValueChange={(value) => setForm((current) => ({ ...current, branchId: value }))}
            >
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
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
