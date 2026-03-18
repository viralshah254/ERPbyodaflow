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
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { fetchPurchaseOrders, approvePurchaseOrders, exportPurchaseOrdersCsv } from "@/lib/api/purchasing";
import { exportDocumentListApi } from "@/lib/api/documents";
import { isApiConfigured } from "@/lib/api/client";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { formatMoney, toBase } from "@/lib/money";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Received", value: "RECEIVED" },
];

const scope = "purchasing-orders";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );
  const [allRows, setAllRows] = React.useState<PurchasingDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPurchaseOrders()
      .then((rows) => {
        if (!cancelled) setAllRows(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          (r.party?.toLowerCase().includes(q))
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return out;
  }, [allRows, search, statusFilter]);

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: PurchasingDocRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "party", header: "Supplier", accessor: "party" as keyof PurchasingDocRow },
      {
        id: "docTotal",
        header: "Doc Total",
        accessor: (r: PurchasingDocRow) =>
          r.total != null ? formatMoney(r.total, r.currency ?? "KES") : "—",
      },
      {
        id: "baseTotal",
        header: "Base (KES)",
        accessor: (r: PurchasingDocRow) => {
          if (r.total == null) return "—";
          const rate = r.exchangeRate ?? 1;
          const baseAmount = (r.currency ?? "KES").toUpperCase() === "KES" ? r.total : toBase(r.total, rate);
          return formatMoney(baseAmount, "KES");
        },
      },
      {
        id: "fxMeta",
        header: "FX",
        accessor: (r: PurchasingDocRow) =>
          (r.currency ?? "KES").toUpperCase() === "KES"
            ? "Base"
            : `${r.currency ?? "KES"} @ ${Number(r.exchangeRate ?? 0).toFixed(4)}`,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PurchasingDocRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearch("");
  };
  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearch("");
  };
  const handleSaveView = () => {
    const v = saveView(scope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: search, status: statusFilter },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };
  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearch((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
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
        title="Purchase Orders"
        description="Manage supplier orders"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Purchase Orders" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/purchase-order/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create PO
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <ExceptionBanner
          type="info"
          title="Procurement workspace"
          description="Use this worklist to control approvals, cash-heavy sourcing, and drill into PO-level audit and landed-cost context."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard title="Total POs" value={allRows.length} subtitle="Current dataset" />
          <OperationalKpiCard title="Pending Approval" value={allRows.filter((r) => r.status === "PENDING_APPROVAL").length} subtitle="Needs action now" severity="warning" />
          <OperationalKpiCard title="Approved" value={allRows.filter((r) => r.status === "APPROVED").length} subtitle="Ready for receiving" />
          <OperationalKpiCard title="Received" value={allRows.filter((r) => r.status === "RECEIVED").length} subtitle="Already fulfilled" severity="success" />
        </div>
        <DataTableToolbar
          searchPlaceholder="Search by number, supplier..."
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
          onExport={() => {
            const fileName = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
            if (isApiConfigured()) {
              exportDocumentListApi("purchase-order", fileName, (msg) => toast.error(msg));
              return;
            }
            exportPurchaseOrdersCsv(filtered);
          }}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await approvePurchaseOrders(selectedIds);
                    setAllRows(await fetchPurchaseOrders());
                    toast.success(`${selectedIds.length} purchase order(s) approved.`);
                    setSelectedIds([]);
                  }}
                >
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPurchaseOrdersCsv(filtered.filter((r) => selectedIds.includes(r.id)))}>
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading purchase orders…</div>
        ) : (
          <DataTable<PurchasingDocRow>
            data={filtered}
            columns={columns}
            onRowClick={(row) => router.push(`/purchasing/orders/${row.id}`)}
            emptyMessage="No purchase orders yet."
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>
    </PageShell>
  );
}
