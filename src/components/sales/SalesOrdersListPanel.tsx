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
import { cn } from "@/lib/utils";
import { formatDocumentCreatedLabel } from "@/lib/format/nairobi-datetime";
import { isOdaflowSalesOrder } from "@/lib/odaflow/sales-order-source";
import * as Icons from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 25;

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
};

export function SalesOrdersListPanel({ savedViewsScope = "sales-orders" }: SalesOrdersListPanelProps) {
  const router = useRouter();
  const baseCurrency = useBaseCurrency();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [channelFilter, setChannelFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() => getSavedViews(savedViewsScope));
  const [rows, setRows] = React.useState<SalesDocRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const page = await fetchSalesDocumentsPageApi("sales-order", {
          limit: PAGE_SIZE,
          cursor: String(offset),
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
          orderChannels: channelFilter === "whatsapp" ? "WHATSAPP,COOLCATCH_WA" : undefined,
        });
        setRows(
          [...page.items].sort((a, b) => {
            const ta = new Date(a.createdAt ?? `${a.date}T00:00:00`).getTime();
            const tb = new Date(b.createdAt ?? `${b.date}T00:00:00`).getTime();
            return tb - ta;
          })
        );
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        setSelectedIds([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load sales orders.");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, statusFilter, channelFilter]
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const handleRefresh = React.useCallback(() => {
    void loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || loading) return;
    void loadPage(Math.max(0, pageOffset - PAGE_SIZE));
  };

  const goToNextPage = () => {
    if (!hasMore || loading) return;
    void loadPage(pageOffset + PAGE_SIZE);
  };

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (channelFilter === "whatsapp") chips.push({ id: "channel", label: "Channel", value: "WhatsApp" });
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, channelFilter, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: SalesDocRow) => <span className="font-medium">{r.number}</span>,
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
      { id: "party", header: "Customer", accessor: "party" as keyof SalesDocRow },
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
          <div className="flex items-center gap-2">
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
    [actionLoadingId, baseCurrency, loadPage, pageOffset]
  );

  const handleClearFilters = () => {
    setStatusFilter("");
    setChannelFilter("");
    setSearch("");
  };

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "channel") setChannelFilter("");
    if (id === "q") setSearch("");
  };

  const handleSaveView = () => {
    const v = saveView(savedViewsScope, {
      name: `View ${savedViews.length + 1}`,
      filters: { q: search, status: statusFilter, channel: channelFilter },
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
    }
    setCurrentViewId(id);
  };

  const handleDeleteView = (id: string) => {
    deleteSavedView(savedViewsScope, id);
    setSavedViews(getSavedViews(savedViewsScope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  const pageNumber = Math.floor(pageOffset / PAGE_SIZE) + 1;
  const rangeStart = rows.length > 0 ? pageOffset + 1 : 0;
  const rangeEnd = pageOffset + rows.length;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        className="shrink-0"
        searchPlaceholder="Search by number, customer..."
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
      {loading ? (
        <SkeletonDataTable rows={PAGE_SIZE} columnWidths={["w-20", "w-24", "w-36", "w-28", "w-24", "w-8"]} />
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
          size="comfortable"
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          {loading
            ? "Loading sales orders…"
            : rows.length === 0
              ? "No sales orders match your filters."
              : `Showing ${rangeStart}–${rangeEnd}`}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading || pageOffset <= 0} onClick={goToPreviousPage}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums px-1">Page {pageNumber}</span>
          <Button variant="outline" size="sm" disabled={loading || !hasMore} onClick={goToNextPage}>
            Next
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">{PAGE_SIZE} per page</span>
        </div>
      </div>
    </div>
  );
}
