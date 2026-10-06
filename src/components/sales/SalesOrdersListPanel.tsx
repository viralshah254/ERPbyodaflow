"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchSalesDocumentsPageApi } from "@/lib/api/sales-docs";
import type { SalesDocRow } from "@/lib/types/sales";
import { exportDocumentListApi } from "@/lib/api/documents";
import { isApiConfigured } from "@/lib/api/client";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import { documentActionApi } from "@/lib/api/documents";
import { downloadCsv } from "@/lib/export/csv";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { LIST_TABLE_STATIC_CLASS } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { formatDocumentCreatedLabel } from "@/lib/format/nairobi-datetime";
import { isOdaflowSalesOrder } from "@/lib/odaflow/sales-order-source";
import { modernTradeArrival } from "@/lib/odaflow/queue-display";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { CustomerLink } from "@/components/customers/CustomerLink";
import { useOrgContextStore } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 25;

/**
 * At least a viewport of orders, and never shorter than ~20 compact rows.
 * The page scrolls only when the window is shorter than that.
 */
const ORDERS_TABLE_MIN_HEIGHT_CLASS =
  "min-h-[max(calc(100dvh-24rem),calc(2.25rem*20+2.5rem))]";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Partially fulfilled", value: "PARTIALLY_FULFILLED" },
  { label: "Fulfilled", value: "FULFILLED" },
];

const CHANNEL_OPTIONS = [
  { label: "All channels", value: "" },
  { label: "WhatsApp", value: "whatsapp" },
];

const TYPE_OPTIONS = [
  { label: "All types", value: "" },
  { label: "Email LPO", value: "email_lpo" },
  { label: "Merchandiser / sales rep", value: "field" },
  { label: "Direct order", value: "direct" },
];

function salesOrderTypeLabel(row: SalesDocRow): string | null {
  if (row.odaflowChannel === "direct") return "Direct order";
  const arrival = modernTradeArrival({
    channel: row.odaflowChannel,
    orderTitle: row.odaflowOrderTitle,
    purchaseOrderNumber: row.number,
  });
  if (arrival === "field") return "Merchandiser / sales rep";
  if (arrival === "email_lpo") return "Email LPO";
  return null;
}

function isWhatsAppStyleSalesOrder(r: SalesDocRow): boolean {
  return (
    r.orderChannel === "WHATSAPP" ||
    r.orderChannel === "COOLCATCH_WA" ||
    (r.reference?.startsWith("WA:") ?? false)
  );
}

function isOdaflowStyleSalesOrder(r: SalesDocRow): boolean {
  return isOdaflowSalesOrder(r);
}

type SalesOrdersListPanelProps = {
  /** Saved views scope — use a distinct key when embedding under Documents vs Sales. */
  savedViewsScope?: string;
  /** Opens the list already filtered, for example from the document center. */
  initialStatus?: string;
};

export function SalesOrdersListPanel({
  savedViewsScope = "sales-orders",
  initialStatus = "",
}: SalesOrdersListPanelProps) {
  const router = useRouter();
  const baseCurrency = useBaseCurrency();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const fmcg = industryCategory === "FMCG" || (industryCategory !== "SEAFOOD" && isFmcgOrg(templateId));
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [channelFilter, setChannelFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() => getSavedViews(savedViewsScope));
  const [rows, setRows] = React.useState<SalesDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [pageSizeOptions, setPageSizeOptions] = React.useState<number[]>([...PAGE_SIZE_OPTIONS]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const page = await fetchSalesDocumentsPageApi("sales-order", {
          limit: pageSize,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
          orderChannels: channelFilter === "whatsapp" ? "WHATSAPP,COOLCATCH_WA" : undefined,
          sfaIntake:
            fmcg && (typeFilter === "email_lpo" || typeFilter === "field" || typeFilter === "direct")
              ? typeFilter
              : undefined,
        });
        setRows(page.items);
        setPageOffset(page.offset);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        if (page.pageSizeOptions?.length) setPageSizeOptions(page.pageSizeOptions);
        setSelectedIds([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load sales orders.");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, channelFilter, fmcg, typeFilter, pageSize]
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const handleRefresh = React.useCallback(() => {
    void loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || loading) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || loading || !nextCursor) return;
    const offset = Number(nextCursor);
    if (!Number.isFinite(offset) || offset < 0) return;
    void loadPage(offset);
  };

  const handlePageSizeChange = (size: number) => {
    if (size === pageSize) return;
    setPageOffset(0);
    setPageSize(size);
  };

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (channelFilter === "whatsapp") chips.push({ id: "channel", label: "Channel", value: "WhatsApp" });
    if (fmcg && typeFilter) {
      const opt = TYPE_OPTIONS.find((o) => o.value === typeFilter);
      chips.push({ id: "type", label: "Type", value: opt?.label ?? typeFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, channelFilter, fmcg, typeFilter, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: SalesDocRow) => (
          <span className="font-medium whitespace-nowrap">{r.number}</span>
        ),
        sticky: true,
      },
      {
        id: "date",
        header: "Created",
        accessor: (r: SalesDocRow) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDocumentCreatedLabel(r.createdAt, r.date)}
          </span>
        ),
      },
      {
        id: "party",
        header: "Customer",
        accessor: (r: SalesDocRow) => (
          <CustomerLink
            id={r.partyId}
            name={r.party}
            className="block max-w-[18rem] truncate"
          />
        ),
      },
      ...(fmcg
        ? [
            {
              id: "type",
              header: "Type",
              accessor: (r: SalesDocRow) => {
                const type = salesOrderTypeLabel(r);
                const placedBy = r.odaflowSalesRepName?.trim();
                if (!type && !placedBy) return <span className="text-muted-foreground">—</span>;
                const detail = [type, placedBy ? `Placed by ${placedBy}` : null]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <p className="max-w-[18rem] truncate text-sm" title={detail}>
                    {detail}
                  </p>
                );
              },
            },
          ]
        : []),
      {
        id: "total",
        header: "Total",
        accessor: (r: SalesDocRow) =>
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
        accessor: (r: SalesDocRow) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <StatusBadge status={r.status} />
            {isOdaflowStyleSalesOrder(r) && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-1 text-sky-700 border-sky-300 dark:text-sky-300 dark:border-sky-700"
              >
                <Icons.ShoppingBag className="h-2.5 w-2.5" />
                Odaflow SFA
              </Badge>
            )}
            {isWhatsAppStyleSalesOrder(r) && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-1 text-green-700 border-green-300 dark:text-green-400 dark:border-green-700"
              >
                <Icons.MessageCircle className="h-2.5 w-2.5" />
                WhatsApp
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: (r: SalesDocRow) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Icons.MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link href={`/docs/sales-order/${r.id}`}>
                  <Icons.Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              {isOdaflowStyleSalesOrder(r) && r.odaflowSourcePdfUrl ? (
                <DropdownMenuItem asChild>
                  <a href={r.odaflowSourcePdfUrl} target="_blank" rel="noopener noreferrer">
                    <Icons.FileText className="mr-2 h-4 w-4" />
                    Original SFA PDF
                  </a>
                </DropdownMenuItem>
              ) : null}
              {r.status === "PENDING_APPROVAL" && (
                <DropdownMenuItem
                  disabled={actionLoadingId === r.id}
                  onClick={async () => {
                    setActionLoadingId(r.id);
                    try {
                      await documentActionApi("sales-order", r.id, "approve");
                      await loadPage(pageOffset);
                      toast.success(`${r.number} approved.`);
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setActionLoadingId(null);
                    }
                  }}
                >
                  <Icons.Check className="mr-2 h-4 w-4 text-emerald-500" />
                  Approve
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [actionLoadingId, baseCurrency, fmcg, loadPage, pageOffset]
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setChannelFilter("");
    setTypeFilter("");
    setSearch("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "channel") setChannelFilter("");
    if (id === "type") setTypeFilter("");
    if (id === "q") setSearch("");
  };

  const handleSaveView = () => {
    const v = saveView(savedViewsScope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: search, status: statusFilter, channel: channelFilter, type: typeFilter },
    });
    setSavedViews(getSavedViews(savedViewsScope));
    setCurrentViewId(v.id);
  };

  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (v?.filters) {
      setSearch((v.filters.q as string) ?? "");
      setStatusFilter((v.filters.status as string) ?? "");
      setChannelFilter((v.filters.channel as string) ?? "");
      setTypeFilter(fmcg ? ((v.filters.type as string) ?? "") : "");
    }
    setCurrentViewId(id);
  };

  const handleDeleteView = (id: string) => {
    deleteSavedView(savedViewsScope, id);
    setSavedViews(getSavedViews(savedViewsScope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        className="shrink-0"
        searchPlaceholder="Search by purchase order, number, or customer"
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
            id: "channel",
            label: "Channel",
            options: CHANNEL_OPTIONS,
            value: channelFilter,
            onChange: (v) => setChannelFilter(v),
          },
          ...(fmcg
            ? [
                {
                  id: "type",
                  label: "Type",
                  options: TYPE_OPTIONS,
                  value: typeFilter,
                  onChange: (v: string) => setTypeFilter(v),
                  triggerClassName: "w-[220px]",
                },
              ]
            : []),
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
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <Icons.RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
        onExport={() => {
          const fileName = `sales-orders-${new Date().toISOString().slice(0, 10)}.csv`;
          if (isApiConfigured()) {
            exportDocumentListApi("sales-order", fileName, (msg) => toast.error(msg));
            return;
          }
          downloadCsv(
            fileName,
            rows.map((row) => ({
              number: row.number,
              date: row.date,
              party: row.party ?? "",
              total: row.total ?? 0,
              status: row.status,
            }))
          );
        }}
      />
      <div className={cn(LIST_TABLE_STATIC_CLASS, ORDERS_TABLE_MIN_HEIGHT_CLASS)}>
        {loading ? (
          <SkeletonDataTable
            rows={pageSize}
            columnWidths={
              fmcg
                ? ["w-20", "w-24", "w-36", "w-40", "w-28", "w-24", "w-8"]
                : ["w-20", "w-24", "w-36", "w-28", "w-24", "w-8"]
            }
          />
        ) : (
          <DataTable<SalesDocRow>
            data={rows}
            columns={columns}
            onRowClick={(row) => router.push(`/docs/sales-order/${row.id}`)}
            emptyMessage="No sales orders yet."
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            scrollMode="natural"
            size="compact"
            className="border-0 shadow-none"
          />
        )}
      </div>
      <TablePagination
        pageOffset={pageOffset}
        pageSize={pageSize}
        itemCount={loading ? 0 : rows.length}
        hasMore={hasMore}
        loading={loading}
        onPrevious={goToPreviousPage}
        onNext={goToNextPage}
        entityLabel="sales orders"
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
