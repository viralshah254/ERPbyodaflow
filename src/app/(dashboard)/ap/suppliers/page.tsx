"use client";

import * as React from "react";
import {
  LIST_PAGE_BODY_PAGINATED_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_STATIC_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { Badge } from "@/components/ui/badge";
import { fetchApSuppliersPageApi, type ApSupplierSummary } from "@/lib/api/payments";
import { fetchPaymentTermsApi } from "@/lib/api/payment-terms";
import { fetchFinancialCurrenciesApi } from "@/lib/api/financial-settings";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  createPartyApi,
  fetchPartiesApi,
  fetchPartyByIdApi,
  updatePartyApi,
  type PartyPayload,
} from "@/lib/api/parties";
import type { FilterChip } from "@/components/ui/filter-chips";
import type { SupplierType } from "@/lib/types/masters";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  RAW_MATERIAL: "Raw material",
  SERVICE: "Service",
  LOGISTICS: "Logistics",
  OTHER: "Other",
};

type APSupplierRow = ApSupplierSummary & {
  paymentTerms?: string;
};

export default function APSuppliersPage() {
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [rows, setRows] = React.useState<APSupplierRow[]>([]);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [terms, setTerms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [currencies, setCurrencies] = React.useState<
    Array<{ id: string; code: string; name: string; isBaseCurrency?: boolean }>
  >([]);
  const { settings: financialSettings } = useFinancialSettings();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    paymentTermsId: "",
    defaultCurrency: "KES",
    taxId: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    void Promise.all([
      fetchPaymentTermsApi(),
      fetchFinancialCurrenciesApi().catch(
        () => [] as Awaited<ReturnType<typeof fetchFinancialCurrenciesApi>>,
      ),
    ])
      .then(([termsData, currenciesData]) => {
        setTerms(termsData.map((term) => ({ id: term.id, name: term.name })));
        setCurrencies(
          currenciesData
            .filter((c) => c.enabled)
            .map((c) => ({
              id: c.code,
              code: c.code,
              name: c.name ?? c.code,
              isBaseCurrency: c.isBaseCurrency,
            })),
        );
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load supplier settings.");
      });
  }, []);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchApSuppliersPageApi({
          limit: pageSize,
          cursor: String(offset),
          search: debouncedSearch || undefined,
          status: statusFilter,
        });
        setRows(
          page.items.map((item) => ({
            ...item,
            paymentTerms: item.paymentTermsName,
          })),
        );
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load AP suppliers.");
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

  React.useEffect(() => {
    if (!drawerOpen) return;
    if (!editingId) {
      const baseCode =
        financialSettings.baseCurrency ||
        currencies.find((c) => c.isBaseCurrency)?.code ||
        currencies[0]?.code ||
        "KES";
      setForm({
        name: "",
        email: "",
        phone: "",
        paymentTermsId: "",
        defaultCurrency: baseCode,
        taxId: "",
      });
      setErrors({});
      setDuplicateWarning(undefined);
      return;
    }
    void fetchPartyByIdApi(editingId)
      .then((party) => {
        if (!party) return;
        setForm({
          name: party.name ?? "",
          email: party.email ?? "",
          phone: party.phone ?? "",
          paymentTermsId: party.paymentTermsId ?? "",
          defaultCurrency: party.defaultCurrency ?? "KES",
          taxId: party.taxId ?? "",
        });
        setErrors({});
        setDuplicateWarning(undefined);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load supplier details.");
      });
  }, [drawerOpen, editingId, financialSettings.baseCurrency, currencies]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    const normalized = form.name.trim();
    if (!normalized) {
      setDuplicateWarning(undefined);
      return;
    }
    const timer = setTimeout(() => {
      void fetchPartiesApi({ role: "supplier", search: normalized, status: "ACTIVE" })
        .then((matches) => {
          const duplicate = matches.find(
            (item) =>
              item.name.trim().toLowerCase() === normalized.toLowerCase() && item.id !== editingId,
          );
          setDuplicateWarning(duplicate ? `Possible duplicate: ${duplicate.name}` : undefined);
        })
        .catch(() => setDuplicateWarning(undefined));
    }, 250);
    return () => clearTimeout(timer);
  }, [drawerOpen, form.name, editingId]);

  const emailLooksValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    const email = form.email.trim();
    if (!email) nextErrors.email = "Email is required.";
    else if (!emailLooksValid(email)) nextErrors.email = "Enter a valid email address.";
    if (!form.phone.trim()) nextErrors.phone = "Contact number is required.";
    if (!form.taxId.trim()) nextErrors.taxId = "KRA PIN is required.";
    const currency = form.defaultCurrency.trim().toUpperCase();
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      nextErrors.defaultCurrency = "Currency must be a 3-letter code (e.g. KES).";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const refreshCurrentPage = React.useCallback(async () => {
    await loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors.");
      return;
    }
    const payload: PartyPayload = {
      name: form.name.trim(),
      roles: ["supplier"],
      email: form.email.trim(),
      phone: form.phone.trim(),
      paymentTermsId: form.paymentTermsId || undefined,
      defaultCurrency: form.defaultCurrency.trim().toUpperCase() || undefined,
      taxId: form.taxId.trim(),
      status: "ACTIVE",
    };
    setSaving(true);
    setDrawerOpen(false);
    setEditingId(null);
    try {
      if (editingId) {
        await updatePartyApi(editingId, payload);
        toast.success("Supplier updated.");
      } else {
        await createPartyApi(payload);
        toast.success("Supplier created.");
      }
      await refreshCurrentPage();
    } catch (err) {
      await refreshCurrentPage();
      toast.error(err instanceof Error ? err.message : "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  };

  const searchPending = searchInput.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter !== "all") chips.push({ id: "status", label: "Status", value: statusFilter });
    if (searchInput.trim()) chips.push({ id: "q", label: "Search", value: searchInput.trim() });
    return chips;
  }, [statusFilter, searchInput]);

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
  };

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + pageSize);
  };

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r: APSupplierRow) => (
          <div className="min-w-[8rem]">
            <p className="font-medium leading-snug">{r.name}</p>
            {r.code && <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{r.code}</p>}
          </div>
        ),
        sticky: true,
        sortable: true,
        sortValue: (r: APSupplierRow) => r.name.toLowerCase(),
      },
      {
        id: "email",
        header: "Contact",
        accessor: (r: APSupplierRow) => (
          <div className="space-y-1 text-sm min-w-[10rem]">
            {r.email ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icons.Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{r.email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            {r.phone ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icons.Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{r.phone}</span>
              </div>
            ) : null}
          </div>
        ),
        sortable: true,
        sortValue: (r: APSupplierRow) => (r.email ?? r.phone ?? "").toLowerCase(),
      },
      {
        id: "paymentTerms",
        header: "Payment terms",
        accessor: (r: APSupplierRow) =>
          r.paymentTerms ? (
            <Badge variant="secondary" className="font-normal">
              <Icons.CalendarClock className="mr-1 h-3 w-3" />
              {r.paymentTerms}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Not set</span>
          ),
        sortable: true,
        sortValue: (r: APSupplierRow) => r.paymentTerms ?? "",
      },
      {
        id: "meta",
        header: "Type / currency",
        accessor: (r: APSupplierRow) => (
          <div className="flex flex-wrap gap-1.5">
            {r.supplierType ? (
              <Badge variant="outline" className="text-xs font-normal">
                {SUPPLIER_TYPE_LABELS[r.supplierType] ?? r.supplierType}
              </Badge>
            ) : null}
            {r.currency ? (
              <Badge variant="outline" className="text-xs font-normal font-mono">
                {r.currency}
              </Badge>
            ) : null}
          </div>
        ),
        sortable: true,
        sortValue: (r: APSupplierRow) => `${r.supplierType ?? ""} ${r.currency ?? ""}`,
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: APSupplierRow) => <StatusBadge status={r.status ?? "ACTIVE"} />,
        sortable: true,
        sortValue: (r: APSupplierRow) => (r.status ?? "ACTIVE").toLowerCase(),
      },
    ],
    [],
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="AP Suppliers"
        description="Suppliers and payment terms"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP Suppliers" },
        ]}
        showCommandHint
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setDrawerOpen(true);
            }}
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add supplier
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 space-y-4 p-4 pb-0">
            <DataTableToolbar
              className="rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search suppliers…"
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              filters={[
                {
                  id: "status",
                  label: "Status",
                  options: [
                    { label: "All statuses", value: "all" },
                    { label: "Active", value: "ACTIVE" },
                    { label: "Inactive", value: "INACTIVE" },
                  ],
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as "all" | "ACTIVE" | "INACTIVE"),
                },
              ]}
              activeFiltersCount={filterChips.length}
              onClearFilters={clearFilters}
              filterChips={filterChips}
              onRemoveFilterChip={(id) => {
                if (id === "status") setStatusFilter("all");
                if (id === "q") setSearchInput("");
              }}
              onExport={() =>
                downloadCsv(
                  `ap-suppliers-${new Date().toISOString().slice(0, 10)}.csv`,
                  rows.map((r) => ({
                    name: r.name,
                    code: r.code ?? "",
                    email: r.email ?? "",
                    phone: r.phone ?? "",
                    paymentTerms: r.paymentTerms ?? "",
                    currency: r.currency ?? "",
                    status: r.status ?? "",
                  })),
                )
              }
            />
          </div>

          {initialLoading ? (
            <div className="p-4">
              <SkeletonDataTable
                rows={pageSize}
                columnWidths={["w-32", "w-40", "w-28", "w-24", "w-20"]}
              />
            </div>
          ) : (
            <div className={cn(LIST_TABLE_STATIC_CLASS, "min-h-0 flex-1 border-0 border-t rounded-none shadow-none")}>
              <TableLinearProgress active={tableBusy} />
              <div
                className={cn(
                  "transition-opacity duration-200",
                  tableBusy && "pointer-events-none opacity-60",
                )}
              >
                <DataTable<APSupplierRow>
                  data={rows}
                  columns={columns}
                  scrollMode="natural"
                  className="border-0 shadow-none"
                  onRowClick={(row) => {
                    setEditingId(row.id);
                    setDrawerOpen(true);
                  }}
                  emptyMessage="No suppliers match your filters."
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
            entityLabel="suppliers"
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? "Edit AP supplier" : "New AP supplier"}
        description={
          editingId ? "Update supplier and payment settings." : "Add supplier with payment terms."
        }
        mode={editingId ? "edit" : "create"}
        duplicateWarning={duplicateWarning}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {editingId ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
            />
            {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>
              Contact number <span className="text-destructive">*</span>
            </Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, phone: e.target.value }));
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              placeholder="e.g. +254712345678"
            />
            {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Payment terms</Label>
            <Select
              value={form.paymentTermsId || "__none__"}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, paymentTermsId: value === "__none__" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency preference</Label>
            <Select
              value={
                form.defaultCurrency && currencies.some((c) => c.code === form.defaultCurrency)
                  ? form.defaultCurrency
                  : (currencies[0]?.code ?? form.defaultCurrency ?? "")
              }
              onValueChange={(value) => {
                setForm((prev) => ({ ...prev, defaultCurrency: value }));
                if (errors.defaultCurrency) setErrors((prev) => ({ ...prev, defaultCurrency: "" }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.code} {c.name && c.name !== c.code ? `- ${c.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.defaultCurrency ? (
              <p className="text-xs text-destructive">{errors.defaultCurrency}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>
              KRA PIN <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.taxId}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, taxId: e.target.value }));
                if (errors.taxId) setErrors((prev) => ({ ...prev, taxId: "" }));
              }}
              placeholder="e.g. P051234567X"
            />
            {errors.taxId ? <p className="text-xs text-destructive">{errors.taxId}</p> : null}
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
