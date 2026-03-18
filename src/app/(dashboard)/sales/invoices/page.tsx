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
import type { SalesDocRow } from "@/lib/types/sales";
import { downloadCsv } from "@/lib/export/csv";
import { fetchSalesDocumentsApi } from "@/lib/api/sales-docs";
import { bulkDocumentActionApi } from "@/lib/api/documents";
import {
  getSavedViews,
  saveView,
  deleteSavedView,
} from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Posted", value: "POSTED" },
];

const scope = "sales-invoices";

export default function SalesInvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );

  const [allRows, setAllRows] = React.useState<SalesDocRow[]>([]);

  const refreshRows = React.useCallback(async () => {
    const items = await fetchSalesDocumentsApi("invoice");
    setAllRows(items);
  }, []);

  React.useEffect(() => {
    void refreshRows().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load invoices.");
    });
  }, [refreshRows]);
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
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
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
        accessor: (r: SalesDocRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof SalesDocRow },
      { id: "party", header: "Customer", accessor: "party" as keyof SalesDocRow },
      {
        id: "total",
        header: "Total",
        accessor: (r: SalesDocRow) =>
          r.total != null ? `KES ${r.total.toLocaleString()}` : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: SalesDocRow) => <StatusBadge status={r.status} />,
      },
    ],
    []
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
        title="Invoices"
        description="Customer invoices"
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Invoices" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/docs/credit-note/new">
                <Icons.RotateCcw className="mr-2 h-4 w-4" />
                Credit Note
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/debit-note/new">
                <Icons.BadgePlus className="mr-2 h-4 w-4" />
                Debit Note
              </Link>
            </Button>
            <Button asChild>
              <Link href="/docs/invoice/new" data-tour-step="create-button">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
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
          onExport={() =>
            downloadCsv(
              `sales-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((row) => ({
                number: row.number,
                date: row.date,
                customer: row.party ?? "",
                total: row.total ?? 0,
                status: row.status,
              }))
            )
          }
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
                    try {
                      await bulkDocumentActionApi("invoice", "post", selectedIds);
                      await refreshRows();
                      setSelectedIds([]);
                      toast.success("Invoice(s) posted.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to post invoices.");
                    }
                  }}
                >
                  Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      `sales-invoices-selected-${new Date().toISOString().slice(0, 10)}.csv`,
                      filtered
                        .filter((row) => selectedIds.includes(row.id))
                        .map((row) => ({
                          number: row.number,
                          date: row.date,
                          customer: row.party ?? "",
                          total: row.total ?? 0,
                          status: row.status,
                        }))
                    )
                  }
                >
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        <DataTable<SalesDocRow>
          data={filtered}
          columns={columns}
          onRowClick={(row) => router.push(`/docs/invoice/${row.id}`)}
          emptyMessage="No invoices yet."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    </PageShell>
  );
}
