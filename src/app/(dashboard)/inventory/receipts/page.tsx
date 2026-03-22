"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchGRNs, postGRN, exportGRNsCsv } from "@/lib/api/grn";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Posted", value: "POSTED" },
  { label: "Received", value: "RECEIVED" },
];

const scope = "inventory-receipts";

export default function InventoryReceiptsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );

  const [allRows, setAllRows] = React.useState<PurchasingDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetchGRNs().then(setAllRows).finally(() => setLoading(false));
  }, []);
  const warehouses = React.useMemo(
    () => Array.from(new Set(allRows.map((r) => r.warehouse).filter(Boolean))) as string[],
    [allRows]
  );
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          (r.poRef?.toLowerCase().includes(q)) ||
          (r.warehouse?.toLowerCase().includes(q))
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    if (warehouseFilter) out = out.filter((r) => r.warehouse === warehouseFilter);
    return out;
  }, [allRows, search, statusFilter, warehouseFilter]);

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (warehouseFilter) chips.push({ id: "wh", label: "Warehouse", value: warehouseFilter });
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, warehouseFilter, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: PurchasingDocRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "poRef", header: "PO Reference", accessor: "poRef" as keyof PurchasingDocRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof PurchasingDocRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: PurchasingDocRow) => <StatusBadge status={r.status} />,
      },
      {
        id: "landedCost",
        header: "Landed Costs",
        accessor: (r: PurchasingDocRow) =>
          r.hasLandedCost ? (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
              <Icons.CheckCircle2 className="h-3 w-3" />
              Costed
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/inventory/costing?grnId=${r.id}`}>
                <Icons.Plus className="h-3 w-3 mr-1" />
                Apply costs
              </Link>
            </Button>
          ),
      },
    ],
    []
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setWarehouseFilter("");
    setSearch("");
  };
  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "wh") setWarehouseFilter("");
    if (id === "q") setSearch("");
  };
  const handleSaveView = () => {
    const v = saveView(scope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: search, status: statusFilter, warehouse: warehouseFilter },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };
  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearch((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
      setWarehouseFilter((v.filters.warehouse as string) ?? "");
    }
    setCurrentViewId(id);
  };
  const handleDeleteView = (id: string) => {
    deleteSavedView(scope, id);
    setSavedViews(getSavedViews(scope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  return (
    <PageShell>
      <PageHeader
        title="Goods Receipt (GRN)"
        description="Record goods received from suppliers"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Receipts" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/grn/new" data-tour-step="create-button">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create GRN
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, PO, warehouse..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "status",
              label: "Status",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: (v) => setStatusFilter(v),
            },
            {
              id: "warehouse",
              label: "Warehouse",
              options: [
                { label: "All", value: "" },
                ...warehouses.map((w) => ({ label: w, value: w })),
              ],
              value: warehouseFilter,
              onChange: (v) => setWarehouseFilter(v),
            },
          ]}
          activeFiltersCount={filterChips.length}
          onClearFilters={handleClearFilters}
          filterChips={filterChips}
          onRemoveFilterChip={handleRemoveFilterChip}
          savedViews={savedViews}
          currentViewId={currentViewId}
          onSelectView={handleSelectView}
          onSaveCurrentView={handleSaveView}
          onDeleteView={handleDeleteView}
          onExport={() => exportGRNsCsv(filtered)}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await Promise.all(selectedIds.map((selectedId) => postGRN(selectedId)));
                    setAllRows(await fetchGRNs());
                    toast.success(`${selectedIds.length} GRN(s) posted.`);
                    setSelectedIds([]);
                  }}
                >
                  Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportGRNsCsv(filtered.filter((row) => selectedIds.includes(row.id)))}
                >
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading receipts…</div>
        ) : (
          <DataTable<PurchasingDocRow>
            data={filtered}
            columns={columns}
            onRowClick={(row) => router.push(`/inventory/receipts/${row.id}`)}
            emptyMessage="No GRNs yet."
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>
    </PageShell>
  );
}
