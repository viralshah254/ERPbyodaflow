"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
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
import {
  createPartyApi,
  fetchPartiesApi,
  fetchPartyByIdApi,
  updatePartyApi,
  uploadPartyCompanyRegistrationApi,
  uploadPartyPinCertificateApi,
} from "@/lib/api/parties";
import type { FilterChip } from "@/components/ui/filter-chips";
import type { CoolcatchSupplierKind } from "@/lib/types/masters";
import {
  emptySupplierMasterForm,
  locationFieldsFromParty,
  SupplierMasterFormFields,
  supplierMasterFormToPayload,
  validateSupplierMasterForm,
  type SupplierMasterFormValues,
} from "@/components/suppliers/SupplierMasterFormFields";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const COOLCATCH_KIND_LABELS: Record<CoolcatchSupplierKind, string> = {
  FARM: "Farm",
  BROKER: "Broker",
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
  const [form, setForm] = React.useState<SupplierMasterFormValues>(() => emptySupplierMasterForm());
  const [pinCertFile, setPinCertFile] = React.useState<File | null>(null);
  const [pinCertExistingUrl, setPinCertExistingUrl] = React.useState<string | null>(null);
  const [companyRegFile, setCompanyRegFile] = React.useState<File | null>(null);
  const [companyRegExistingUrl, setCompanyRegExistingUrl] = React.useState<string | null>(null);
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
      setForm(emptySupplierMasterForm(baseCode));
      setPinCertFile(null);
      setPinCertExistingUrl(null);
      setCompanyRegFile(null);
      setCompanyRegExistingUrl(null);
      setErrors({});
      setDuplicateWarning(undefined);
      return;
    }
    void fetchPartyByIdApi(editingId)
      .then((party) => {
        if (!party) return;
        setForm({
          ...emptySupplierMasterForm(party.defaultCurrency ?? "KES"),
          coolcatchSupplierKind: party.coolcatchSupplierKind ?? "BROKER",
          name: party.name ?? "",
          contactPersonFirstName: party.contactPersonFirstName ?? "",
          contactPersonLastName: party.contactPersonLastName ?? "",
          email: party.email ?? "",
          phone: party.phone ?? "",
          paymentTermsId: party.paymentTermsId ?? "",
          defaultCurrency: party.defaultCurrency ?? "KES",
          taxId: party.taxId ?? "",
          supplierBankAccountName: party.supplierBankAccountName ?? "",
          supplierBankAccountNumber: party.supplierBankAccountNumber ?? "",
          supplierBankBranchName: party.supplierBankBranchName ?? "",
          ...locationFieldsFromParty(party),
        });
        setPinCertFile(null);
        setPinCertExistingUrl(party.pinCertificateUrl ?? null);
        setCompanyRegFile(null);
        setCompanyRegExistingUrl(party.companyRegistrationUrl ?? null);
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

  function validateForm(): boolean {
    const nextErrors = validateSupplierMasterForm(form);
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
    const payload = supplierMasterFormToPayload(form);
    setSaving(true);
    try {
      let savedId = editingId;
      if (editingId) {
        await updatePartyApi(editingId, payload);
        toast.success("Supplier updated.");
      } else {
        const created = await createPartyApi(payload);
        savedId = created.id;
        toast.success("Supplier created.");
      }
      if (savedId) {
        if (pinCertFile) {
          try {
            await uploadPartyPinCertificateApi(savedId, pinCertFile);
            toast.success("KRA PIN certificate uploaded.");
          } catch {
            toast.error("Supplier saved but KRA PIN certificate upload failed.");
          }
        }
        if (companyRegFile) {
          try {
            await uploadPartyCompanyRegistrationApi(savedId, companyRegFile);
            toast.success("Company registration uploaded.");
          } catch {
            toast.error("Supplier saved but company registration upload failed.");
          }
        }
      }
      setDrawerOpen(false);
      setEditingId(null);
      setPinCertFile(null);
      setCompanyRegFile(null);
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
        header: "Kind / currency",
        accessor: (r: APSupplierRow) => (
          <div className="flex flex-wrap gap-1.5">
            {r.coolcatchSupplierKind ? (
              <Badge variant="outline" className="text-xs font-normal">
                {COOLCATCH_KIND_LABELS[r.coolcatchSupplierKind] ?? r.coolcatchSupplierKind}
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
        sortValue: (r: APSupplierRow) => `${r.coolcatchSupplierKind ?? ""} ${r.currency ?? ""}`,
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
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 space-y-4 p-4 pb-0">
            <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
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
            <div className={cn(LIST_TABLE_SURFACE_CLASS, "min-h-0 flex-1 border-0 border-t rounded-none shadow-none")}>
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
                  scrollMode="fill"
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
        <SupplierMasterFormFields
          form={form}
          onChange={setForm}
          errors={errors}
          onClearError={(key) => setErrors((prev) => ({ ...prev, [key]: "" }))}
          terms={terms}
          currencies={currencies}
          pinCertFile={pinCertFile}
          onPinCertFileChange={setPinCertFile}
          pinCertExistingUrl={pinCertExistingUrl}
          companyRegFile={companyRegFile}
          onCompanyRegFileChange={setCompanyRegFile}
          companyRegExistingUrl={companyRegExistingUrl}
        />
      </EntityDrawer>
    </PageShell>
  );
}
