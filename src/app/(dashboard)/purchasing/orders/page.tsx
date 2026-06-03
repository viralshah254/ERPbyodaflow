"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  approvePurchaseOrders,
  exportPurchaseOrdersCsv,
  fetchPurchaseOrdersPageApi,
  type PurchaseOrdersSummary,
} from "@/lib/api/purchasing";
import { exportDocumentListApi } from "@/lib/api/documents";
import { isApiConfigured } from "@/lib/api/client";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const STATUS_OPTIONS = [
  { label: "Open (Active)", value: "OPEN" },
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const scope = "purchasing-orders";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const baseCurrency = useBaseCurrency();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("OPEN");
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope),
  );
  const [rows, setRows] = React.useState<PurchasingDocRow[]>([]);
  const [summary, setSummary] = React.useState<PurchaseOrdersSummary | null>(null);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchPurchaseOrdersPageApi({
          limit: pageSize,
          cursor: String(offset),
          status: statusFilter || undefined,
          search: debouncedSearch.trim() || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        if (page.summary) setSummary(page.summary);
        setSelectedIds([]);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load purchase orders.",
        );
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, statusFilter, pageSize],
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const searchPending = search.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

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
        accessor: (r: PurchasingDocRow) => (
          <span className="font-medium">{r.number}</span>
        ),
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
          ) : (
            "—"
          ),
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
                  await loadPage(pageOffset);
                } finally {
                  setApprovingId(null);
                }
              }}
            >
              {approvingId === r.id ? (
                <Icons.Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icons.CheckCircle className="h-3 w-3 mr-1" />
              )}
              Approve
            </Button>
          ) : null,
      },
    ],
    [approvingId, loadPage, pageOffset, baseCurrency],
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

  const kpiTotal = summary?.total ?? 0;
  const kpiPending = summary?.pendingApproval ?? 0;
  const kpiApproved = summary?.approved ?? 0;
  const kpiReceived = summary?.received ?? 0;

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Purchase Orders"
        description="Manage supplier orders"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Purchase Orders" },
        ]}
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
      <div className={LIST_PAGE_BODY_CLASS}>
        <ExceptionBanner
          type="info"
          title="Procurement workspace"
          description="Use this worklist to control approvals, cash-heavy sourcing, and drill into PO-level audit and landed-cost context."
        />
        <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard
            title="Total POs"
            value={initialLoading ? "—" : kpiTotal}
            subtitle="All purchase orders"
          />
          <OperationalKpiCard
            title="Pending Approval"
            value={initialLoading ? "—" : kpiPending}
            subtitle="Needs action now"
            severity="warning"
          />
          <OperationalKpiCard
            title="Approved"
            value={initialLoading ? "—" : kpiApproved}
            subtitle="Ready for receiving"
          />
          <OperationalKpiCard
            title="Received"
            value={initialLoading ? "—" : kpiReceived}
            subtitle="Already fulfilled"
            severity="success"
          />
        </div>
        <DataTableToolbar
          className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
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
            exportPurchaseOrdersCsv(rows);
          }}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const pendingIds = selectedIds.filter(
                      (sid) => rows.find((r) => r.id === sid)?.status === "PENDING_APPROVAL",
                    );
                    if (pendingIds.length === 0) {
                      toast.info("No pending-approval POs in selection.");
                      return;
                    }
                    await approvePurchaseOrders(pendingIds);
                    toast.success(`${pendingIds.length} purchase order(s) approved.`);
                    setSelectedIds([]);
                    await loadPage(pageOffset);
                  }}
                >
                  Approve (
                  {
                    selectedIds.filter(
                      (sid) => rows.find((r) => r.id === sid)?.status === "PENDING_APPROVAL",
                    ).length
                  }
                  )
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportPurchaseOrdersCsv(rows.filter((r) => selectedIds.includes(r.id)))
                  }
                >
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        {initialLoading ? (
          <SkeletonDataTable
            rows={pageSize}
            columnWidths={["w-20", "w-24", "w-32", "w-24", "w-20", "w-24"]}
          />
        ) : (
          <div className={LIST_TABLE_SURFACE_CLASS}>
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                LIST_TABLE_SCROLL_BODY_CLASS,
                tableBusy && "pointer-events-none opacity-60",
              )}
            >
              <DataTable<PurchasingDocRow>
                data={rows}
                columns={columns}
                scrollMode="fill"
                className="border-0 shadow-none"
                onRowClick={(row) => router.push(`/purchasing/orders/${row.id}`)}
                emptyMessage="No purchase orders match your filters."
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </div>
          </div>
        )}
        <TablePagination
          className="shrink-0"
          pageOffset={pageOffset}
          pageSize={pageSize}
          itemCount={initialLoading ? 0 : rows.length}
          hasMore={hasMore}
          loading={initialLoading}
          busy={tableBusy}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          entityLabel="purchase orders"
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </PageShell>
  );
}
