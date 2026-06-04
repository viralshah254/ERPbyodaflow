"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDocTypeConfig, DOC_TYPES } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { type DocListRow } from "@/lib/types/documents";
import { downloadCsv } from "@/lib/export/csv";
import {
  bulkDocumentActionApi,
  exportDocumentListApi,
  fetchDocumentListPageApi,
} from "@/lib/api/documents";
import { isApiConfigured } from "@/lib/api/client";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import {
  DOC_BULK_POST_RULES,
  filterIdsForBulkApprove,
  filterIdsForBulkPost,
  partitionBulkDocResults,
} from "@/lib/documents/bulk-eligibility";
import { DocumentNumber } from "@/components/docs/document-number";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatMoney } from "@/lib/money";
import { useCanWriteDocType } from "@/lib/rbac/use-write-guard";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 25;

const TYPE_LABELS: Record<string, string> = {
  quote: "quote",
  "sales-order": "salesOrder",
  "delivery-note": "deliveryNote",
  invoice: "invoice",
  "purchase-request": "purchaseRequest",
  "purchase-order": "purchaseOrder",
  grn: "goodsReceipt",
  bill: "bill",
  journal: "journalEntry",
};

const DEFAULT_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Posted", value: "POSTED" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Converted", value: "CONVERTED" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "Delivered", value: "DELIVERED" },
];

const STATUS_OPTIONS_BY_TYPE: Partial<
  Record<DocTypeKey, { label: string; value: string }[]>
> = {
  journal: [
    { label: "All", value: "" },
    { label: "Draft", value: "DRAFT" },
    { label: "Posted", value: "POSTED" },
  ],
};

function buildColumns(
  type: string,
  _terminology: ReturnType<typeof useTerminology>,
): {
  id: string;
  header: string;
  accessor: keyof DocListRow | ((r: DocListRow) => React.ReactNode);
  sticky?: boolean;
}[] {
  const config = getDocTypeConfig(type);
  if (!config) return [];
  return config.listColumns.map((col) => {
    const accessor = col.accessor as keyof DocListRow;
    let acc: keyof DocListRow | ((r: DocListRow) => React.ReactNode) = accessor;
    if (accessor === "total") {
      acc = (r) =>
        r.total != null
          ? formatMoney(Number(r.total), r.currency ?? "KES", {
              decimals: Number(r.total) % 1 === 0 ? 0 : 2,
            })
          : "—";
    } else if (accessor === "status") {
      acc = (r) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={r.status} />
          {r.pendingApprovalReason && r.status === "PENDING_APPROVAL" && (
            <span className="inline-flex items-center gap-1 text-xs rounded bg-amber-500/10 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 font-medium">
              <Icons.AlertTriangle className="h-3 w-3 shrink-0" />
              Credit limit exceeded
            </span>
          )}
        </div>
      );
    } else if (accessor === "number") {
      acc = (r) => (
        <DocumentNumber value={r.number ?? "—"} className="font-medium" />
      );
    } else if (accessor === "reference") {
      const ref = (r: DocListRow) => r.reference ?? r.poRef ?? "";
      acc = (r) => {
        const text = ref(r);
        if (!text) return "—";
        return (
          <span
            className="block max-w-[min(320px,40vw)] truncate font-mono text-xs"
            title={text}
          >
            {text}
          </span>
        );
      };
    }
    return {
      id: col.id,
      header: col.header,
      accessor: acc,
      sticky: col.sticky ?? false,
    };
  });
}

export default function DocTypeListPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const canWrite = useCanWriteDocType(type);
  const labelKey = (config?.termKey ?? TYPE_LABELS[type]) as string;
  const label = t(
    labelKey as
      | "salesOrder"
      | "quote"
      | "deliveryNote"
      | "invoice"
      | "journalEntry"
      | "purchaseOrder"
      | "purchaseRequest"
      | "bill"
      | "goodsReceipt",
    terminology,
  );
  const scope = `doc-${type}`;

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope),
  );
  const [rows, setRows] = React.useState<DocListRow[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const hasLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    hasLoadedOnce.current = false;
    setRows([]);
    setPageOffset(0);
    setInitialLoading(true);
  }, [type]);

  React.useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [search]);

  const loadPage = React.useCallback(
    async (offset: number) => {
      if (!DOC_TYPES.includes(type as DocTypeKey)) return;
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) {
        setInitialLoading(true);
      } else {
        setFetching(true);
      }
      try {
        const page = await fetchDocumentListPageApi(type as DocTypeKey, {
          limit: PAGE_SIZE,
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
        toast.error((error as Error).message);
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [type, statusFilter, debouncedSearch],
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const handleRefresh = React.useCallback(() => {
    void loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - PAGE_SIZE));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + PAGE_SIZE);
  };

  const columns = React.useMemo(
    () => buildColumns(type, terminology),
    [type, terminology],
  );

  const statusOptions = React.useMemo(
    () => STATUS_OPTIONS_BY_TYPE[type as DocTypeKey] ?? DEFAULT_STATUS_OPTIONS,
    [type],
  );

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = statusOptions.find((o) => o.value === statusFilter);
      chips.push({
        id: "status",
        label: "Status",
        value: opt?.label ?? statusFilter,
      });
    }
    if (search.trim()) {
      chips.push({ id: "q", label: "Search", value: search.trim() });
    }
    return chips;
  }, [statusFilter, search, statusOptions]);

  const handleRemoveFilterChip = (id: string) => {
    if (id === "status") setStatusFilter("");
    if (id === "q") setSearch("");
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearch("");
  };

  const handleSaveCurrentView = () => {
    const name = `View ${savedViews.length + 1}`;
    const v = saveView(scope, {
      name,
      filters: { q: search, status: statusFilter },
    });
    setSavedViews(getSavedViews(scope));
    setCurrentViewId(v.id);
  };

  const handleSelectView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (!v?.filters) {
      setCurrentViewId(id);
      return;
    }
    setSearch((v.filters.q as string) ?? "");
    setStatusFilter((v.filters.status as string) ?? "");
    setCurrentViewId(id);
  };

  const handleDeleteView = (id: string) => {
    deleteSavedView(scope, id);
    setSavedViews(getSavedViews(scope));
    if (currentViewId === id) setCurrentViewId(null);
  };

  const handleExport = () => {
    const fileName = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (rows.length === 0) {
      toast.error(`No ${label.toLowerCase()}s to export.`);
      return;
    }
    if (isApiConfigured()) {
      exportDocumentListApi(type as DocTypeKey, fileName, (message) =>
        toast.error(message),
      );
      return;
    }
    downloadCsv(
      fileName,
      rows.map((row) => ({
        number: row.number,
        date: row.date,
        party: row.party ?? "",
        reference: row.reference ?? row.poRef ?? "",
        total: row.total ?? 0,
        status: row.status,
      })),
    );
  };

  const selectedRows = React.useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds],
  );

  const showBulkApprove =
    canWrite &&
    selectedIds.length > 0 &&
    selectedRows.some((r) => r.status === "PENDING_APPROVAL");
  const showBulkPost =
    canWrite &&
    selectedIds.length > 0 &&
    DOC_BULK_POST_RULES[type as DocTypeKey]?.canPost === true;

  const handleBulkApprove = async () => {
    const approveIds = filterIdsForBulkApprove(selectedRows, selectedIds);
    if (!approveIds.length) {
      if (type === "invoice") {
        toast.info(
          "Approve only applies to items pending approval (e.g. credit policy). For draft invoices, use Post.",
        );
      } else {
        toast.info(
          "None of the selected items are pending approval. Submit for approval first where required.",
        );
      }
      return;
    }
    try {
      const { results } = await bulkDocumentActionApi(
        type as DocTypeKey,
        "approve",
        approveIds,
      );
      const { succeeded, failed } = partitionBulkDocResults(results);
      await loadPage(pageOffset);
      if (succeeded.length) {
        toast.success(
          `${succeeded.length} ${label.toLowerCase()} record(s) approved.`,
        );
      }
      if (failed.length) {
        toast.error(
          `${failed.length} failed: ${failed.map((f) => f.error).join("; ")}`,
        );
      }
      setSelectedIds([]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleBulkPost = async () => {
    const postIds = filterIdsForBulkPost(
      type as DocTypeKey,
      selectedRows,
      selectedIds,
    );
    const rule = DOC_BULK_POST_RULES[type as DocTypeKey];
    if (!rule?.canPost) {
      toast.info("This document type cannot be posted from the list.");
      return;
    }
    if (!postIds.length) {
      if (rule.postOnlyWhenApproved) {
        toast.info(
          "Select approved items only. Draft documents must be submitted and approved before posting.",
        );
      } else {
        toast.info(
          "None of the selected items can be posted. Choose drafts or approved documents that are not already posted or cancelled.",
        );
      }
      return;
    }
    try {
      const { results } = await bulkDocumentActionApi(
        type as DocTypeKey,
        "post",
        postIds,
      );
      const { succeeded, failed } = partitionBulkDocResults(results);
      await loadPage(pageOffset);
      if (succeeded.length) {
        toast.success(
          `${succeeded.length} ${label.toLowerCase()} record(s) posted.`,
        );
      }
      if (failed.length) {
        toast.error(
          `${failed.length} failed: ${failed.map((f) => f.error).join("; ")}`,
        );
      }
      setSelectedIds([]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const isValidType = DOC_TYPES.includes(type as DocTypeKey);
  const searchPending = search.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;
  const skeletonColumnWidths = React.useMemo(() => {
    const widths = columns.map((col) => {
      if (col.id === "number") return "w-24";
      if (col.id === "date") return "w-20";
      if (col.id === "party") return "w-36";
      if (col.id === "total") return "w-28";
      if (col.id === "status") return "w-24";
      return "w-24";
    });
    return widths.length ? widths : ["w-24", "w-20", "w-36", "w-28", "w-24"];
  }, [columns]);

  const searchPlaceholder =
    type === "purchase-order"
      ? "Search PO number (letters O, digits 0) or supplier…"
      : type === "journal"
        ? "Search by number or reference…"
        : `Search by number, party…`;

  if (!isValidType) {
    return (
      <PageShell>
        <PageHeader
          title="Documents"
          breadcrumbs={[{ label: "Documents", href: "/docs" }]}
        />
        <div className="p-6">
          <p className="text-muted-foreground">Unknown document type.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={label}
        description={`List and manage ${label.toLowerCase()}s`}
        breadcrumbs={[{ label: "Documents", href: "/docs" }, { label }]}
        showCommandHint
        actions={
          canWrite ? (
            <Button asChild>
              <Link href={`/docs/${type}/new`} data-tour-step="create-button">
                <Icons.Plus className="mr-2 h-4 w-4" />
                New {label}
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar
          className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
          searchPlaceholder={searchPlaceholder}
          searchValue={search}
          onSearchChange={setSearch}
          searchInputProps={{
            spellCheck: false,
            autoComplete: "off",
            className: "font-mono text-sm tracking-tight",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              options: statusOptions,
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
          onSaveCurrentView={handleSaveCurrentView}
          onDeleteView={handleDeleteView}
          onExport={handleExport}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={initialLoading || fetching}
              onClick={handleRefresh}
            >
              <Icons.RefreshCw
                className={cn(
                  "h-4 w-4 mr-1.5",
                  (initialLoading || fetching) && "animate-spin",
                )}
              />
              Refresh
            </Button>
          }
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                {showBulkApprove ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkApprove}
                  >
                    Approve
                  </Button>
                ) : null}
                {showBulkPost ? (
                  <Button variant="outline" size="sm" onClick={handleBulkPost}>
                    Post
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        {initialLoading ? (
          <SkeletonDataTable
            rows={PAGE_SIZE}
            columnWidths={skeletonColumnWidths}
          />
        ) : (
          <div className={LIST_TABLE_SURFACE_CLASS}>
            <TableLinearProgress active={tableBusy} />
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col transition-opacity duration-200",
                tableBusy && "pointer-events-none opacity-60",
              )}
            >
              <DataTable<DocListRow>
                data={rows}
                columns={columns}
                scrollMode="fill"
                maxVisibleRows={PAGE_SIZE}
                className="min-h-0 flex-1 border-0"
                onRowClick={(row) => router.push(`/docs/${type}/${row.id}`)}
                emptyMessage={`No ${label.toLowerCase()}s found.`}
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
          pageSize={PAGE_SIZE}
          itemCount={initialLoading ? 0 : rows.length}
          hasMore={hasMore}
          loading={initialLoading || fetching}
          busy={searchPending}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
          entityLabel={`${label.toLowerCase()}s`}
        />
      </div>
    </PageShell>
  );
}
