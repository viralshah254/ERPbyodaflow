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
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";

const STATUS_OPTIONS = [
  { label: "Open (Active)", value: "OPEN" },
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const OPEN_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED"];

const scope = "purchasing-orders";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const baseCurrency = useBaseCurrency();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("OPEN");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );
  const [allRows, setAllRows] = React.useState<PurchasingDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setAllRows(await fetchPurchaseOrders());
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (statusFilter === "OPEN") {
      out = out.filter((r) => OPEN_STATUSES.includes(r.status));
    } else if (statusFilter) {
      out = out.filter((r) => r.status === statusFilter);
    }
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
        id: "amount",
        header: "Amount",
        accessor: (r: PurchasingDocRow) =>
          r.total != null ? (
            <DualCurrencyAmount
              amount={r.total}
              currency={r.currency ?? baseCurrency}
              exchangeRate={r.exchangeRate}
              baseCurrency={baseCurrency}
              align="right"
              size="sm"
            />
          ) : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PurchasingDocRow) => <StatusBadge status={r.status} />,
      },
      {
        id: "actions",
        header: "",
        accessor: (r: PurchasingDocRow) =>
          r.status === "PENDING_APPROVAL" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={approvingId === r.id}
              onClick={async (e) => {
                e.stopPropagation();
                setApprovingId(r.id);
                try {
                  await approvePurchaseOrders([r.id]);
                  toast.success(`${r.number} approved.`);
                  await reload();
                } finally {
                  setApprovingId(null);
                }
              }}
            >
              {approvingId === r.id ? <Icons.Loader2 className="h-3 w-3 animate-spin" /> : <Icons.CheckCircle className="h-3 w-3 mr-1" />}
              Approve
            </Button>
          ) : null,
      },
    ],
    [approvingId, reload, baseCurrency]
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
                    const pendingIds = selectedIds.filter(
                      (sid) => allRows.find((r) => r.id === sid)?.status === "PENDING_APPROVAL"
                    );
                    if (pendingIds.length === 0) {
                      toast.info("No pending-approval POs in selection.");
                      return;
                    }
                    await approvePurchaseOrders(pendingIds);
                    toast.success(`${pendingIds.length} purchase order(s) approved.`);
                    setSelectedIds([]);
                    await reload();
                  }}
                >
                  Approve ({selectedIds.filter((sid) => allRows.find((r) => r.id === sid)?.status === "PENDING_APPROVAL").length})
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
