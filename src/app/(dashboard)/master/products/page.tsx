"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { getMockProducts, type ProductRow } from "@/lib/mock/masters";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const productIcon = "Package" as const;

export default function MasterProductsPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const productLabel = t("product", terminology);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const allRows = React.useMemo(() => getMockProducts(), []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.category?.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      out = out.filter((r) => r.status === statusFilter);
    }
    return out;
  }, [allRows, search, statusFilter]);

  const columns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: ProductRow) => <span className="font-medium">{r.sku}</span>,
        sticky: true,
      },
      { id: "name", header: "Name", accessor: "name" as keyof ProductRow },
      { id: "category", header: "Category", accessor: "category" as keyof ProductRow },
      { id: "unit", header: "Unit", accessor: "unit" as keyof ProductRow },
      {
        id: "currentStock",
        header: "Stock",
        accessor: (r: ProductRow) => r.currentStock ?? "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: ProductRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  const handleImport = () => {
    if (typeof window !== "undefined") {
      toast.info("Bulk import (stub): CSV preview would open here.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={productLabel + "s"}
        description="Manage products and SKUs"
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: productLabel + "s" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => { setEditingId(null); setDrawerOpen(true); }}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add {productLabel}
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by SKU, name, category..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All", value: "" },
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ],
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
          ]}
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
            icon={productIcon}
            title={`No ${productLabel.toLowerCase()}s found`}
            description="Add your first product or adjust filters."
            action={{
              label: `Add ${productLabel}`,
              onClick: () => setDrawerOpen(true),
            }}
          />
        ) : (
          <DataTable<ProductRow>
            data={filtered}
            columns={columns}
            onRowClick={(row) => router.push(`/master/products/${row.id}`)}
            emptyMessage={`No ${productLabel.toLowerCase()}s.`}
          />
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? `Edit ${productLabel}` : `New ${productLabel}`}
        description={editingId ? "Update product details." : "Add a new product."}
        mode={editingId ? "edit" : "create"}
        duplicateWarning={!editingId ? "Possible duplicate: similar SKU exists (stub)." : undefined}
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input placeholder="e.g. SKU-001" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Product name" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input placeholder="Category" />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input placeholder="pcs, kg, etc." />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
