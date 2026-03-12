"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PurchasingDocRow } from "@/lib/mock/purchasing";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/saved-views";
import type { SavedView } from "@/components/ui/saved-views-dropdown";
import type { FilterChip } from "@/components/ui/filter-chips";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadCsv } from "@/lib/export/csv";
import { createPurchaseReturn, listPurchaseReturns, updatePurchaseReturnStatus } from "@/lib/data/purchasing.repo";
import {
  purchaseReturnCreate,
  purchaseReturnApprove,
  purchaseReturnsExport,
} from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Posted", value: "POSTED" },
];

const scope = "purchasing-returns";

export default function PurchaseReturnsPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedReturn, setSelectedReturn] = React.useState<PurchasingDocRow | null>(null);
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const [savedViews, setSavedViews] = React.useState<SavedView[]>(() =>
    getSavedViews(scope)
  );

  const [allRows, setAllRows] = React.useState<PurchasingDocRow[]>(() => listPurchaseReturns());

  const refreshRows = React.useCallback(() => {
    setAllRows(listPurchaseReturns());
  }, []);
  const filtered = React.useMemo(() => {
    let out = allRows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          (r.party?.toLowerCase().includes(q)) ||
          (r.poRef?.toLowerCase().includes(q))
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
        accessor: (r: PurchasingDocRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof PurchasingDocRow },
      { id: "party", header: "Supplier", accessor: "party" as keyof PurchasingDocRow },
      { id: "poRef", header: "PO Ref", accessor: "poRef" as keyof PurchasingDocRow },
      {
        id: "total",
        header: "Total",
        accessor: (r: PurchasingDocRow) =>
          r.total != null ? `KES ${r.total.toLocaleString()}` : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: PurchasingDocRow) => <StatusBadge status={r.status} />,
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

  const handleCreateReturn = async () => {
    setCreating(true);
    try {
      await purchaseReturnCreate({});
      refreshRows();
      toast.success("Purchase return created.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((row) => ({
        number: row.number,
        date: row.date,
        supplier: row.party ?? "",
        poRef: row.poRef ?? "",
        total: row.total ?? 0,
        status: row.status,
      }))
    );
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setApproving(true);
    try {
      for (const returnId of selectedIds) {
        await purchaseReturnApprove(returnId);
        updatePurchaseReturnStatus(returnId, "APPROVED");
      }
      refreshRows();
      toast.success(`Approved ${selectedIds.length} return(s).`);
      setSelectedIds([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Purchase Returns"
        description="Manage returns to suppliers"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Purchase Returns" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button disabled={creating} onClick={handleCreateReturn}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Return
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, supplier, PO..."
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
          onExport={handleExport}
          bulkActions={
            selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                <Button variant="outline" size="sm" disabled={approving} onClick={handleBulkApprove}>
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export
                </Button>
              </div>
            ) : undefined
          }
        />
        <DataTable<PurchasingDocRow>
          data={filtered}
          columns={columns}
          onRowClick={(row) => {
            setSelectedReturn(row);
            setDetailOpen(true);
          }}
          emptyMessage="No purchase returns yet."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{selectedReturn?.number ?? "Purchase return"}</SheetTitle>
            <SheetDescription>Return-to-vendor summary, approval state, and linked PO reference.</SheetDescription>
          </SheetHeader>
          {selectedReturn && (
            <div className="mt-6 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Supplier:</span> {selectedReturn.party ?? "—"}</p>
              <p><span className="text-muted-foreground">Date:</span> {selectedReturn.date}</p>
              <p><span className="text-muted-foreground">PO ref:</span> {selectedReturn.poRef ?? "—"}</p>
              <p><span className="text-muted-foreground">Total:</span> KES {(selectedReturn.total ?? 0).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Status:</span> {selectedReturn.status}</p>
              <div className="pt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    updatePurchaseReturnStatus(selectedReturn.id, "APPROVED");
                    refreshRows();
                    setSelectedReturn(listPurchaseReturns().find((row) => row.id === selectedReturn.id) ?? selectedReturn);
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
