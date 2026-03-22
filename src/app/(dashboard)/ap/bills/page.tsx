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
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { fetchApBillsApi } from "@/lib/api/payments";
import { fetchDocumentListApi } from "@/lib/api/documents";
import type { APBillRow } from "@/lib/types/ap";
import type { DocListRow } from "@/lib/types/documents";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const AP_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "Partially Paid", value: "PARTIALLY_APPLIED" },
  { label: "Paid", value: "PAID" },
];

const ALL_BILLS_STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Posted", value: "POSTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const scope = "ap-bills";

type Tab = "open" | "all";

export default function APBillsPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("all");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );

  const [apRows, setApRows] = React.useState<APBillRow[]>([]);
  const [allDocRows, setAllDocRows] = React.useState<DocListRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [apBills, docBills] = await Promise.all([
        fetchApBillsApi(search).catch(() => [] as APBillRow[]),
        fetchDocumentListApi("bill").catch(() => [] as DocListRow[]),
      ]);
      setApRows(apBills);
      setAllDocRows(docBills);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load bills.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    void reload();
  }, [reload]);
  // "All Bills" tab — document-centre data mapped to the same shape for easy rendering
  const allBillsRows: APBillRow[] = React.useMemo(
    () =>
      allDocRows.map((r) => ({
        id: r.id,
        number: r.number,
        date: r.date,
        party: r.party ?? "",
        total: r.total ?? 0,
        status: r.status,
      })),
    [allDocRows]
  );

  const statusOptions = tab === "open" ? AP_STATUS_OPTIONS : ALL_BILLS_STATUS_OPTIONS;

  const filteredRows = React.useMemo(() => {
    const source = tab === "open" ? apRows : allBillsRows;
    let out = source;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.party.toLowerCase().includes(q)
      );
    }
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return out;
  }, [tab, apRows, allBillsRows, search, statusFilter]);

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter) {
      const opt = statusOptions.find((o) => o.value === statusFilter);
      chips.push({ id: "status", label: "Status", value: opt?.label ?? statusFilter });
    }
    if (search.trim()) chips.push({ id: "q", label: "Search", value: search.trim() });
    return chips;
  }, [statusFilter, search, statusOptions]);

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Number",
        accessor: (r: APBillRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof APBillRow },
      { id: "party", header: "Supplier", accessor: "party" as keyof APBillRow },
      {
        id: "total",
        header: "Total",
        accessor: (r: APBillRow) => (
          <DualCurrencyAmount
            amount={r.total}
            currency={r.currency ?? "KES"}
            exchangeRate={r.exchangeRate}
            align="right"
            size="sm"
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: APBillRow) => <StatusBadge status={r.status} />,
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
        title="Bills"
        description="Supplier bills (AP)"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP Bills" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/docs/purchase-credit-note/new">
                <Icons.RotateCcw className="mr-2 h-4 w-4" />
                Credit Note
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/purchase-debit-note/new">
                <Icons.BadgePlus className="mr-2 h-4 w-4" />
                Debit Note
              </Link>
            </Button>
            <Button asChild>
              <Link href="/docs/bill/new" data-tour-step="create-button">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Create Bill
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {tab === "open" && (
          <ExceptionBanner
            type="info"
            title="Open AP balances"
            description="Shows posted bills with outstanding balances from the AP subledger. Draft bills appear in the All Bills tab."
          />
        )}
        <div className="flex gap-1 border-b pb-px">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${tab === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setTab("all"); setStatusFilter(""); }}
          >
            All Bills
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${tab === "open" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setTab("open"); setStatusFilter(""); }}
          >
            Open Balances
          </button>
        </div>
        <DataTableToolbar
          searchPlaceholder="Search by number, supplier..."
          searchValue={search}
          onSearchChange={setSearch}
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
          onSaveCurrentView={handleSaveView}
          onDeleteView={handleDeleteView}
          onExport={() =>
            downloadCsv(
              `ap-bills-${new Date().toISOString().slice(0, 10)}.csv`,
              filteredRows.map((row) => ({
                number: row.number,
                date: row.date,
                supplier: row.party,
                totalAmount: row.total,
                currency: "KES",
                status: row.status,
              }))
            )
          }
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info("Posting from this list is not yet wired. Open each bill to post.");
                  }}
                >
                  Post
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      `ap-bills-selected-${new Date().toISOString().slice(0, 10)}.csv`,
                      filteredRows
                        .filter((row) => selectedIds.includes(row.id))
                        .map((row) => ({
                          number: row.number,
                          date: row.date,
                          supplier: row.party,
                          totalAmount: row.total,
                          currency: "KES",
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
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading bills…</div>
        ) : (
          <DataTable<APBillRow>
            data={filteredRows}
            columns={columns}
            onRowClick={(row) => router.push(`/docs/bill/${row.id}`)}
            emptyMessage={tab === "open" ? "No open AP balances. Bills appear here once posted." : "No bills yet."}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>
    </PageShell>
  );
}
