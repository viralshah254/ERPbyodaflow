"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LIST_PAGE_BODY_PAGINATED_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_STATIC_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  exportGRNsCsv,
  fetchInventoryReceiptsPageApi,
  postGRN,
  type GrnPostError,
} from "@/lib/api/grn";
import { fetchSubcontractOrders } from "@/lib/api/cool-catch";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Posted", value: "POSTED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Bill linked (Converted)", value: "CONVERTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function GrnStatusCell({ status }: { status: string }) {
  if (status === "CONVERTED") {
    return (
      <div className="flex flex-col gap-0.5">
        <StatusBadge status="POSTED" />
        <span className="text-[10px] text-muted-foreground leading-tight">Bill linked</span>
      </div>
    );
  }
  return <StatusBadge status={status} />;
}

const scope = "inventory-receipts";

export default function InventoryReceiptsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [warehouseOptions, setWarehouseOptions] = React.useState<{ label: string; value: string }[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() => getSavedViews(scope));
  const [rows, setRows] = React.useState<PurchasingDocRow[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [subcontractedGrnIds, setSubcontractedGrnIds] = React.useState<Set<string>>(new Set());
  const [postingId, setPostingId] = React.useState<string | null>(null);
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    fetchWarehouseOptions()
      .then((opts) =>
        setWarehouseOptions(opts.map((o) => ({ label: o.label, value: o.id }))),
      )
      .catch(() => {});
    fetchSubcontractOrders({})
      .then((scos) => {
        const grnIds = new Set(
          scos.map((s) => s.grnId).filter((id): id is string => id != null && id !== ""),
        );
        setSubcontractedGrnIds(grnIds);
      })
      .catch(() => {});
  }, []);

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
        const page = await fetchInventoryReceiptsPageApi({
          limit: pageSize,
          cursor: String(offset),
          status: statusFilter || undefined,
          search: debouncedSearch.trim() || undefined,
          warehouseId: warehouseFilter || undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setSelectedIds([]);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load goods receipts.",
        );
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [debouncedSearch, statusFilter, warehouseFilter, pageSize],
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
    if (warehouseFilter) {
      const wh = warehouseOptions.find((o) => o.value === warehouseFilter);
      chips.push({ id: "wh", label: "Warehouse", value: wh?.label ?? warehouseFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, warehouseFilter, search, warehouseOptions]);

  const handlePostRow = React.useCallback(
    async (row: PurchasingDocRow, e: React.MouseEvent) => {
      e.stopPropagation();
      setPostingId(row.id);
      try {
        await postGRN(row.id);
        toast.success(`${row.number} posted.`);
        await loadPage(pageOffset);
      } catch (raw) {
        const err = raw as GrnPostError;
        const msg = err.message ?? "Failed to post GRN.";
        if (err.code === "GRN_OPEN_VARIANCE") {
          const auditUrl = err.poId
            ? `/purchasing/cash-weight-audit?poId=${encodeURIComponent(err.poId)}`
            : "/purchasing/cash-weight-audit";
          toast.error(msg, {
            action: { label: "Go to audit", onClick: () => { window.location.href = auditUrl; } },
            duration: 8000,
          });
        } else if (err.code === "GRN_MISSING_WEIGHT") {
          toast.error(msg, {
            action: {
              label: "Open GRN",
              onClick: () => { window.location.href = `/inventory/receipts/${row.id}`; },
            },
            duration: 8000,
          });
        } else {
          toast.error(msg);
        }
      } finally {
        setPostingId(null);
      }
    },
    [loadPage, pageOffset],
  );

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: PurchasingDocRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "party", header: "Supplier", accessor: (r: PurchasingDocRow) => r.party || "—" },
      { id: "poRef", header: "PO Reference", accessor: "poRef" as keyof PurchasingDocRow },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" as keyof PurchasingDocRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: PurchasingDocRow) => <GrnStatusCell status={r.status} />,
      },
      {
        id: "subcontracted",
        header: "VAS",
        accessor: (r: PurchasingDocRow) => {
          const badges: React.ReactNode[] = [];
          if (subcontractedGrnIds.has(r.id)) {
            badges.push(
              <Badge key="sub" variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                <Icons.Factory className="h-3 w-3" />
                Subcontracted
              </Badge>,
            );
          }
          if (r.workOrderId && r.workOrderStatus !== "CANCELLED") {
            if (r.workOrderStatus === "COMPLETED") {
              badges.push(
                <Badge
                  key="wo"
                  variant="outline"
                  className="text-emerald-600 border-emerald-300 text-xs gap-1 whitespace-nowrap"
                >
                  <Icons.CheckCircle2 className="h-3 w-3" />
                  Processed
                </Badge>,
              );
            } else {
              badges.push(
                <Badge
                  key="wo"
                  variant="outline"
                  className="text-amber-600 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-xs gap-1 whitespace-nowrap"
                >
                  <Icons.Settings2 className="h-3 w-3" />
                  {r.workOrderNumber ?? "In work order"}
                </Badge>,
              );
            }
          }
          return badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : null;
        },
      },
      {
        id: "landedCost",
        header: "Additional costs",
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
      {
        id: "rowActions",
        header: "",
        accessor: (r: PurchasingDocRow) =>
          r.status === "DRAFT" || r.status === "APPROVED" ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      disabled={postingId === r.id || !r.hasLandedCost}
                      onClick={(e) => handlePostRow(r, e)}
                    >
                      {postingId === r.id ? (
                        <Icons.Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Post"
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!r.hasLandedCost && (
                  <TooltipContent side="left">
                    Apply additional costs before posting
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ) : null,
      },
    ],
    [subcontractedGrnIds, postingId, handlePostRow],
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
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Goods Receipt (GRN)"
        description="Canonical GRN operations queue: post receipts, complete landed costs, and move to putaway."
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Receipts" },
        ]}
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/purchasing/goods-receipt">Purchasing View</Link>
            </Button>
            <Button asChild>
              <Link href="/docs/grn/new" data-tour-step="create-button">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Create GRN
              </Link>
            </Button>
          </div>
        }
      />
      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
        <DataTableToolbar
          className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder="Search by number, PO, supplier, warehouse..."
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
              options: [{ label: "All", value: "" }, ...warehouseOptions],
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
          onExport={() => exportGRNsCsv(rows)}
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
                    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
                    const postable = selectedRows.filter(
                      (r) => r.status === "DRAFT" || r.status === "APPROVED",
                    );
                    const skipped = selectedRows.length - postable.length;
                    if (!postable.length) {
                      toast.warning(
                        "No selected GRNs are eligible to post. Only draft GRNs can be posted.",
                      );
                      return;
                    }
                    const results = await Promise.allSettled(postable.map((r) => postGRN(r.id)));
                    const succeeded = results.filter((r) => r.status === "fulfilled").length;
                    const failedResults = results
                      .map((r, i) =>
                        r.status === "rejected"
                          ? { row: postable[i], reason: r.reason as GrnPostError }
                          : null,
                      )
                      .filter(
                        (x): x is { row: (typeof postable)[number]; reason: GrnPostError } =>
                          x !== null,
                      );
                    setSelectedIds([]);
                    await loadPage(pageOffset);
                    const parts: string[] = [];
                    if (succeeded) parts.push(`${succeeded} GRN(s) posted.`);
                    if (skipped) parts.push(`${skipped} skipped (already posted or bill linked).`);
                    if (failedResults.length) parts.push(`${failedResults.length} failed.`);
                    if (failedResults.length === 1) {
                      const { row, reason } = failedResults[0];
                      if (reason.code === "GRN_OPEN_VARIANCE") {
                        const auditUrl = reason.poId
                          ? `/purchasing/cash-weight-audit?poId=${encodeURIComponent(reason.poId)}`
                          : "/purchasing/cash-weight-audit";
                        toast.error(parts.join(" "), {
                          action: {
                            label: "Go to cash-weight audit",
                            onClick: () => { window.location.href = auditUrl; },
                          },
                          duration: 8000,
                        });
                      } else if (reason.code === "GRN_MISSING_WEIGHT") {
                        toast.error(parts.join(" "), {
                          action: {
                            label: `Open ${row.number}`,
                            onClick: () => {
                              window.location.href = `/inventory/receipts/${row.id}`;
                            },
                          },
                          duration: 8000,
                        });
                      } else {
                        toast.error(parts.join(" "), {
                          action: {
                            label: `Open ${row.number}`,
                            onClick: () => {
                              window.location.href = `/inventory/receipts/${row.id}`;
                            },
                          },
                          duration: 8000,
                        });
                      }
                    } else if (failedResults.length > 1) {
                      toast.error(parts.join(" ") + " Open each GRN for details.");
                    } else if (skipped && !succeeded) {
                      toast.warning(parts.join(" "));
                    } else {
                      toast.success(parts.join(" "));
                    }
                  }}
                >
                  Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportGRNsCsv(rows.filter((row) => selectedIds.includes(row.id)))
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
            columnWidths={["w-20", "w-24", "w-32", "w-24", "w-24", "w-20", "w-24", "w-28", "w-16"]}
          />
        ) : (
          <div className={LIST_TABLE_STATIC_CLASS}>
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
                scrollMode="natural"
                className="border-0 shadow-none"
                onRowClick={(row) => router.push(`/inventory/receipts/${row.id}`)}
                emptyMessage="No GRNs match your filters."
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
          entityLabel="receipts"
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </PageShell>
  );
}
