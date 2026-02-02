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
import { getMockDocs, type DocListRow } from "@/lib/mock/docs";
import {
  getSavedViews,
  saveView,
  deleteSavedView,
} from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import * as Icons from "lucide-react";

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
    } else if (accessor === "status") {
      acc = (r) => <StatusBadge status={r.status} />;
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
  const allRows = React.useMemo(() => getMockDocs(type), [type]);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          (r.party?.toLowerCase().includes(q)) ||
          (r.reference?.toLowerCase().includes(q)) ||
          (r.poRef?.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      out = out.filter((r) => r.status === statusFilter);
    }
    return out;
  }, [allRows, search, statusFilter]);

  const columns = React.useMemo(
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
    // Stub: toast or similar
    if (typeof window !== "undefined") {
      window.alert(`Export (stub): ${filtered.length} rows for ${type}`);
    }
  };

  const handleBulkApprove = () => {
    if (typeof window !== "undefined") {
      window.alert(`Approve (stub): ${selectedIds.length} selected`);
    }
    setSelectedIds([]);
  };

  const handleBulkPost = () => {
    if (typeof window !== "undefined") {
      window.alert(`Post (stub): ${selectedIds.length} selected`);
    }
    setSelectedIds([]);
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
            <Link href={`/docs/${type}/new`}>
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
                <Button variant="outline" size="sm" onClick={handleBulkApprove}>
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkPost}>
                  Post
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        <DataTable<DocListRow>
          data={filtered}
          columns={columns}
          onRowClick={(row) => router.push(`/docs/${type}/${row.id}`)}
          emptyMessage={`No ${label.toLowerCase()}s found.`}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    </PageShell>
  );
}
