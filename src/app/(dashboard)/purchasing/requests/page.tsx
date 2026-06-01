"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchPurchaseRequestsPageApi } from "@/lib/api/purchase-requests";
import { downloadCsv } from "@/lib/export/csv";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Converted", value: "CONVERTED" },
];

const scope = "purchasing-requests";

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<PurchasingDocRow[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope),
  );
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
        const page = await fetchPurchaseRequestsPageApi({
          limit: pageSize,
          cursor: String(offset),
          status: statusFilter || undefined,
          search: debouncedSearch.trim() || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setSelectedIds([]);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load purchase requests.",
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
      { id: "party", header: "Requester", accessor: "party" as keyof PurchasingDocRow },
      {
        id: "amount",
        header: "Amount",
        accessor: (r: PurchasingDocRow) =>
          r.total != null ? (
            <DualCurrencyAmount
              amount={r.total}
              currency={r.currency ?? "KES"}
              exchangeRate={r.exchangeRate}
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
        id: "rowActions",
        header: "",
        accessor: (r: PurchasingDocRow) =>
          r.status === "APPROVED" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs whitespace-nowrap"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={`/docs/purchase-request/${r.id}`}>
                <Icons.ShoppingCart className="h-3 w-3 mr-1" />
                Create PO
              </Link>
            </Button>
          ) : null,
      },
    ],
    [],
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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Purchase Requests"
        description="Requisitions and approval flow"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Purchase Requests" },
        ]}
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/purchase-request/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create Request
            </Link>
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar
          className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search by number, requester..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `purchase-requests-${new Date().toISOString().slice(0, 10)}.csv`,
              rows.map((row) => ({
                number: row.number,
                date: row.date,
                party: row.party ?? "",
                total: row.total ?? "",
                status: row.status,
              })),
            )
          }
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
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                {rows.some((r) => selectedIds.includes(r.id) && r.status === "APPROVED") && (
                  <span className="text-xs text-muted-foreground">
                    Approved requests can be converted to POs individually using the
                    &quot;Create PO&quot; button on each row.
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/purchasing/orders")}
                >
                  Open orders
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
                "transition-opacity duration-200",
                tableBusy && "pointer-events-none opacity-60",
              )}
            >
              <DataTable<PurchasingDocRow>
                data={rows}
                columns={columns}
                scrollMode="fill"
                className="border-0 shadow-none"
                onRowClick={(row) => router.push(`/docs/purchase-request/${row.id}`)}
                emptyMessage="No purchase requests match your filters."
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
          entityLabel="purchase requests"
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </PageShell>
  );
}
