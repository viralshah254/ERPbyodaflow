"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SCROLL_BODY_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadCsv } from "@/lib/export/csv";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import {
  approvePurchaseReturnApi,
  createPurchaseReturnApi,
  exportPurchaseReturnsApi,
  fetchPurchaseReturnsPageApi,
  type PurchaseReturnRow,
} from "@/lib/api/purchase-returns";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Posted", value: "POSTED" },
];

const scope = "purchasing-returns";

export default function PurchaseReturnsPage() {
  const baseCurrency = useBaseCurrency();
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedReturn, setSelectedReturn] = React.useState<PurchaseReturnRow | null>(null);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() => getSavedViews(scope));

  const [rows, setRows] = React.useState<PurchaseReturnRow[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchPurchaseReturnsPageApi({
          limit: pageSize,
          cursor: String(offset),
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setSelectedIds([]);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load purchase returns.");
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

  const searchPending = searchInput.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (searchInput.trim()) chips.push({ id: "q", label: "Search", value: searchInput.trim() });
    return chips;
  }, [statusFilter, searchInput]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: PurchaseReturnRow) => (
          <div className="flex items-center gap-2 min-w-[6rem]">
            <Icons.Undo2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{r.number}</span>
          </div>
        ),
        sticky: true,
        sortable: true,
        sortValue: (r: PurchaseReturnRow) => r.number.toLowerCase(),
      },
      {
        id: "date",
        header: "Date",
        accessor: (r: PurchaseReturnRow) => <span className="tabular-nums text-sm">{r.date}</span>,
        sortable: true,
        sortValue: (r: PurchaseReturnRow) => r.date,
      },
      {
        id: "party",
        header: "Supplier",
        accessor: (r: PurchaseReturnRow) => (
          <div className="flex items-center gap-1.5 min-w-[8rem]">
            <Icons.Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium">{r.party ?? "—"}</span>
          </div>
        ),
        sortable: true,
        sortValue: (r: PurchaseReturnRow) => (r.party ?? "").toLowerCase(),
      },
      {
        id: "grnRef",
        header: "GRN Ref",
        accessor: (r: PurchaseReturnRow) =>
          r.grnRef ? (
            <Badge variant="outline" className="font-mono text-xs font-normal">
              {r.grnRef}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
        sortable: true,
        sortValue: (r: PurchaseReturnRow) => r.grnRef ?? "",
      },
      {
        id: "total",
        header: "Total",
        accessor: (r: PurchaseReturnRow) =>
          r.total != null ? (
            <DualCurrencyAmount
              amount={r.total}
              currency={r.currency ?? baseCurrency}
              baseCurrency={baseCurrency}
              align="right"
              size="sm"
            />
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
        sortable: true,
        sortValue: (r: PurchaseReturnRow) => r.total ?? 0,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PurchaseReturnRow) => <StatusBadge status={r.status} />,
        sortable: true,
        sortValue: (r: PurchaseReturnRow) => r.status.toLowerCase(),
      },
    ],
    [baseCurrency],
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearchInput("");
    setDebouncedSearch("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearchInput("");
  };

  const handleSaveView = () => {
    const v = saveView(scope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: searchInput, status: statusFilter },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };

  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearchInput((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
    }
    setCurrentViewId(id);
  };

  const handleDeleteView = (id: string) => {
    deleteSavedView(scope, id);
    setSavedViews(getSavedViews(scope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  const refreshCurrentPage = () => void loadPage(pageOffset);

  const handleCreateReturn = async () => {
    setCreating(true);
    try {
      await createPurchaseReturnApi();
      await loadPage(0);
      toast.success("Purchase return created.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleExport = () => {
    exportPurchaseReturnsApi((message) => {
      downloadCsv(
        `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`,
        rows.map((row) => ({
          number: row.number,
          date: row.date,
          supplier: row.party ?? "",
          grnRef: row.grnRef ?? "",
          total: row.total ?? 0,
          currency: row.currency ?? baseCurrency,
          status: row.status,
        })),
      );
      if (message) toast.message(message);
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setApproving(true);
    try {
      for (const returnId of selectedIds) {
        await approvePurchaseReturnApi(returnId);
      }
      await refreshCurrentPage();
      toast.success(`Approved ${selectedIds.length} return(s).`);
      setSelectedIds([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + pageSize);
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Purchase Returns"
        description="Manage returns to suppliers"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Purchase Returns" },
        ]}
        showCommandHint
        actions={
          <Button disabled={creating} onClick={() => void handleCreateReturn()}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Return
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 p-4 pb-0">
            <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search by number, supplier, GRN ref…"
              searchValue={searchInput}
              onSearchChange={setSearchInput}
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
              onExport={handleExport}
              bulkActions={
                selectedIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                    <Button variant="outline" size="sm" disabled={approving} onClick={() => void handleBulkApprove()}>
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      Export
                    </Button>
                  </div>
                ) : undefined
              }
            />
          </div>

          {initialLoading ? (
            <div className="p-4">
              <SkeletonDataTable
                rows={pageSize}
                columnWidths={["w-24", "w-20", "w-28", "w-20", "w-20", "w-16"]}
              />
            </div>
          ) : (
            <div
              className={cn(
                LIST_TABLE_SURFACE_CLASS,
                "min-h-0 flex-1 border-0 border-t rounded-none shadow-none",
              )}
            >
              <TableLinearProgress active={tableBusy} />
              <div
                className={cn(
                  LIST_TABLE_SCROLL_BODY_CLASS,
                  tableBusy && "pointer-events-none opacity-60",
                )}
              >
                <DataTable<PurchaseReturnRow>
                  data={rows}
                  columns={columns}
                  scrollMode="fill"
                  className="border-0 shadow-none"
                  onRowClick={(row) => {
                    setSelectedReturn(row);
                    setDetailOpen(true);
                  }}
                  emptyMessage="No purchase returns match your filters."
                  selectable
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
              </div>
            </div>
          )}

          <TablePagination
            className="border-t px-4"
            pageOffset={pageOffset}
            pageSize={pageSize}
            itemCount={initialLoading ? 0 : rows.length}
            hasMore={hasMore}
            loading={initialLoading}
            busy={tableBusy}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
            entityLabel="returns"
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{selectedReturn?.number ?? "Purchase return"}</SheetTitle>
            <SheetDescription>
              Return-to-vendor summary, approval state, and linked GRN reference.
            </SheetDescription>
          </SheetHeader>
          {selectedReturn && (
            <div className="mt-6 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Supplier:</span> {selectedReturn.party ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span> {selectedReturn.date}
              </p>
              <p>
                <span className="text-muted-foreground">GRN ref:</span> {selectedReturn.grnRef ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{" "}
                {formatMoney(selectedReturn.total ?? 0, selectedReturn.currency ?? baseCurrency)}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={selectedReturn.status} />
              </p>
              <div className="pt-4">
                <Button
                  size="sm"
                  onClick={async () => {
                    await approvePurchaseReturnApi(selectedReturn.id);
                    await refreshCurrentPage();
                    setDetailOpen(false);
                    toast.success("Return approved.");
                  }}
                >
                  Approve return
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
