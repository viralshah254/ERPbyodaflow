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
import { getMockWarehouses, type WarehouseRow } from "@/lib/mock/masters";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function MasterWarehousesPage() {
  const terminology = useTerminology();
  const warehouseLabel = t("warehouse", terminology);

  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const allRows = React.useMemo(() => getMockWarehouses(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.branch?.toLowerCase().includes(q))
    );
  }, [allRows, search]);

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
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
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
          onExport={() => toast.info("Export (stub)")}
          actions={
            <Link
              href="/settings/customizer/fields"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Custom fields
            </Link>
          }
        />
        {filtered.length === 0 ? (
          <EmptyState
            icon="MapPin"
            title={`No ${warehouseLabel.toLowerCase()}s`}
            description="Add your first warehouse."
            action={{
              label: `Add ${warehouseLabel}`,
              onClick: () => setDrawerOpen(true),
            }}
          />
        ) : (
          <DataTable<WarehouseRow>
            data={filtered}
            columns={columns}
            onRowClick={(row) => {
              setEditingId(row.id);
              setDrawerOpen(true);
            }}
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
        duplicateWarning={!editingId ? "Possible duplicate: similar code exists (stub)." : undefined}
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input placeholder="e.g. WH-Main" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Warehouse name" />
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Input placeholder="Branch" />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
