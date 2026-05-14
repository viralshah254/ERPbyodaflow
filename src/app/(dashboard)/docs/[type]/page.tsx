"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
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
import {
  getSavedViews,
  saveView,
  deleteSavedView,
} from "@/lib/saved-views";
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

const STATUS_OPTIONS = [
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

function buildColumns(
  type: string,
  _terminology: ReturnType<typeof useTerminology>
): { id: string; header: string; accessor: keyof DocListRow | ((r: DocListRow) => React.ReactNode); sticky?: boolean }[] {
  const config = getDocTypeConfig(type);
  if (!config) return [];
  return config.listColumns.map((col) => {
    const accessor = col.accessor as keyof DocListRow;
    let acc: keyof DocListRow | ((r: DocListRow) => React.ReactNode) = accessor;
    if (accessor === "total") {
      acc = (r) =>
        r.total != null ? `KES ${Number(r.total).toLocaleString()}` : "—";
    } else     if (accessor === "status") {
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
      acc = (r) => <span className="font-medium">{r.number}</span>;
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
  const labelKey = (config?.termKey ?? TYPE_LABELS[type]) as string;
  const label = t(labelKey as "salesOrder" | "quote" | "deliveryNote" | "invoice" | "journalEntry" | "purchaseOrder" | "purchaseRequest" | "bill" | "goodsReceipt", terminology);
  const scope = `doc-${type}`;

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );
  const [allRows, setAllRows] = React.useState<DocListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMoreList, setHasMoreList] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadFirstPage = React.useCallback(async () => {
    if (!DOC_TYPES.includes(type as DocTypeKey)) return;
    setLoading(true);
    try {
      const page = await fetchDocumentListPageApi(type as DocTypeKey, {
        limit: 50,
        status: statusFilter || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setAllRows(page.items);
      setHasMoreList(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [type, statusFilter, debouncedSearch]);

  const loadMore = React.useCallback(async () => {
    if (!DOC_TYPES.includes(type as DocTypeKey) || !nextCursor || !hasMoreList || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchDocumentListPageApi(type as DocTypeKey, {
        limit: 50,
        cursor: nextCursor,
        status: statusFilter || undefined,
        search: debouncedSearch.trim() || undefined,
      });
      setAllRows((prev) => [...prev, ...page.items]);
      setHasMoreList(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [type, statusFilter, debouncedSearch, nextCursor, hasMoreList, loadingMore]);

    () => buildColumns(type, terminology),
    [type, terminology]
  );

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) {
      chips.push({ id: "q", label: "Search", value: search.trim() });
    }
    return chips;
  }, [statusFilter, search]);

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
    if (allRows.length === 0) {
      toast.error(`No ${label.toLowerCase()}s to export.`);
      return;
    }
    if (isApiConfigured()) {
      exportDocumentListApi(type as DocTypeKey, fileName, (message) => toast.error(message));
      return;
    }
    downloadCsv(
      fileName,
      allRows.map((row) => ({
        number: row.number,
        date: row.date,
        party: row.party ?? "",
        reference: row.reference ?? row.poRef ?? "",
        total: row.total ?? 0,
        status: row.status,
      }))
    );
  };

  const selectedRows = React.useMemo(
    () => allRows.filter((r) => selectedIds.includes(r.id)),
    [allRows, selectedIds]
  );

  const showBulkApprove =
    selectedIds.length > 0 &&
    selectedRows.some((r) => r.status === "PENDING_APPROVAL");
  const showBulkPost =
    selectedIds.length > 0 && DOC_BULK_POST_RULES[type as DocTypeKey]?.canPost === true;

  const handleBulkApprove = async () => {
    const approveIds = filterIdsForBulkApprove(selectedRows, selectedIds);
    if (!approveIds.length) {
      if (type === "invoice") {
        toast.info(
          "Approve only applies to items pending approval (e.g. credit policy). For draft invoices, use Post."
        );
      } else {
        toast.info(
          "None of the selected items are pending approval. Submit for approval first where required."
        );
      }
      return;
    }
    try {
      const { results } = await bulkDocumentActionApi(type as DocTypeKey, "approve", approveIds);
      const { succeeded, failed } = partitionBulkDocResults(results);
      await loadFirstPage();
      if (succeeded.length) {
        toast.success(
          `${succeeded.length} ${label.toLowerCase()} record(s) approved.`
        );
      }
      if (failed.length) {
        toast.error(`${failed.length} failed: ${failed.map((f) => f.error).join("; ")}`);
      }
      setSelectedIds([]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleBulkPost = async () => {
    const postIds = filterIdsForBulkPost(type as DocTypeKey, selectedRows, selectedIds);
    const rule = DOC_BULK_POST_RULES[type as DocTypeKey];
    if (!rule?.canPost) {
      toast.info("This document type cannot be posted from the list.");
      return;
    }
    if (!postIds.length) {
      if (rule.postOnlyWhenApproved) {
        toast.info(
          "Select approved items only. Draft documents must be submitted and approved before posting."
        );
      } else {
        toast.info(
          "None of the selected items can be posted. Choose drafts or approved documents that are not already posted or cancelled."
        );
      }
      return;
    }
    try {
      const { results } = await bulkDocumentActionApi(type as DocTypeKey, "post", postIds);
      const { succeeded, failed } = partitionBulkDocResults(results);
      await loadFirstPage();
      if (succeeded.length) {
        toast.success(`${succeeded.length} ${label.toLowerCase()} record(s) posted.`);
      }
      if (failed.length) {
        toast.error(`${failed.length} failed: ${failed.map((f) => f.error).join("; ")}`);
      }
      setSelectedIds([]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const isValidType = DOC_TYPES.includes(type as DocTypeKey);

  if (!isValidType) {
    return (
      <PageShell>
        <PageHeader title="Documents" breadcrumbs={[{ label: "Documents", href: "/docs" }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Unknown document type.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={label}
        description={`List and manage ${label.toLowerCase()}s`}
        breadcrumbs={[
          { label: "Documents", href: "/docs" },
          { label },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href={`/docs/${type}/new`} data-tour-step="create-button">
              <Icons.Plus className="mr-2 h-4 w-4" />
              New {label}
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder={`Search by number, party...`}
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
          onSaveCurrentView={handleSaveCurrentView}
          onDeleteView={handleDeleteView}
          onExport={handleExport}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                {showBulkApprove ? (
                  <Button variant="outline" size="sm" onClick={handleBulkApprove}>
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
        {loading ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Loading {label.toLowerCase()}s...
          </div>
        ) : (
          <>
            <DataTable<DocListRow>
              data={allRows}
              columns={columns}
              onRowClick={(row) => router.push(`/docs/${type}/${row.id}`)}
              emptyMessage={`No ${label.toLowerCase()}s found.`}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
            {hasMoreList ? (
              <div className="flex justify-center pt-2">
                <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
