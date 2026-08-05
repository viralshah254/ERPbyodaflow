"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/ui/row-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fetchArCustomerSummariesApi, type ArCustomerSummary } from "@/lib/api/payments";
import { fetchPaymentTermsApi } from "@/lib/api/payment-terms";
import { fetchFinancialCurrenciesApi } from "@/lib/api/financial-settings";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { createCustomerCategoryApi, fetchCustomerCategoriesApi } from "@/lib/api/customer-categories";
import {
  createPartyApi,
  fetchPartiesApi,
  fetchPartyByIdApi,
  updatePartyApi,
  type PartyPayload,
} from "@/lib/api/parties";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KraTaxPinField } from "@/components/parties/KraTaxPinField";
import { useCanWriteFinance, useCanWriteSales } from "@/lib/rbac/use-write-guard";

export type CustomerAccountsPanelProps = {
  editCustomerId?: string | null;
  onEditCustomerIdChange?: (id: string | null) => void;
  /** Opens the shared New customer form (identity + optional credit). */
  onAddCustomer?: () => void;
  /** When true (Finance entry), credit fields are the primary focus. */
  creditFocused?: boolean;
  onCustomerSaved?: () => void;
};

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export function CustomerAccountsPanel({
  editCustomerId = null,
  onEditCustomerIdChange,
  onAddCustomer,
  creditFocused = false,
  onCustomerSaved,
}: CustomerAccountsPanelProps) {
  const router = useRouter();
  const canWriteFinance = useCanWriteFinance();
  const canWriteSales = useCanWriteSales();
  const canEditCredit = canWriteFinance || canWriteSales;
  const { settings: financialSettings } = useFinancialSettings();
  const currency = financialSettings.baseCurrency?.trim()?.toUpperCase() || "KES";

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [summaries, setSummaries] = React.useState<ArCustomerSummary[]>([]);
  const [terms, setTerms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [currencies, setCurrencies] = React.useState<
    Array<{ id: string; code: string; name: string; isBaseCurrency?: boolean }>
  >([]);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    creditLimit: "",
    paymentTermsId: "",
    customerCategoryId: "",
    creditControlMode: "AMOUNT" as "AMOUNT" | "DAYS" | "HYBRID",
    maxOutstandingInvoiceAgeDays: "",
    perInvoiceDaysToPayCap: "",
    creditWarningThresholdPct: "",
    defaultCurrency: "KES",
    taxId: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | undefined>(undefined);
  const [newCategoryName, setNewCategoryName] = React.useState("");

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  React.useEffect(() => {
    if (!editCustomerId || drawerOpen) return;
    setEditingId(editCustomerId);
    setDrawerOpen(true);
  }, [editCustomerId, drawerOpen]);

  const closeDrawer = React.useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    onEditCustomerIdChange?.(null);
  }, [onEditCustomerIdChange]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [customers, termsData, categoriesData, currenciesData] = await Promise.all([
        fetchArCustomerSummariesApi(debouncedSearch),
        fetchPaymentTermsApi(),
        fetchCustomerCategoriesApi(),
        fetchFinancialCurrenciesApi().catch(() => [] as Awaited<ReturnType<typeof fetchFinancialCurrenciesApi>>),
      ]);
      setTerms(termsData.map((term) => ({ id: term.id, name: term.name })));
      setCategories(categoriesData.filter((item) => item.isActive).map((item) => ({ id: item.id, name: item.name })));
      setCurrencies(
        currenciesData
          .filter((c) => c.enabled)
          .map((c) => ({ id: c.code, code: c.code, name: c.name ?? c.code, isBaseCurrency: c.isBaseCurrency }))
      );
      setSummaries(customers ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

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
        creditLimit: "",
        paymentTermsId: "",
        customerCategoryId: "",
        creditControlMode: "AMOUNT",
        maxOutstandingInvoiceAgeDays: "",
        perInvoiceDaysToPayCap: "",
        creditWarningThresholdPct: "",
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
          creditLimit:
            party.creditLimit != null && Number.isFinite(party.creditLimit) ? String(party.creditLimit) : "",
          paymentTermsId: party.paymentTermsId ?? "",
          customerCategoryId: party.customerCategoryId ?? "",
          creditControlMode: party.creditControlMode ?? "AMOUNT",
          maxOutstandingInvoiceAgeDays:
            party.maxOutstandingInvoiceAgeDays != null ? String(party.maxOutstandingInvoiceAgeDays) : "",
          perInvoiceDaysToPayCap:
            party.perInvoiceDaysToPayCap != null ? String(party.perInvoiceDaysToPayCap) : "",
          creditWarningThresholdPct:
            party.creditWarningThresholdPct != null ? String(party.creditWarningThresholdPct) : "",
          defaultCurrency: party.defaultCurrency ?? currency,
          taxId: party.taxId ?? "",
        });
        setErrors({});
        setDuplicateWarning(undefined);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load customer details.");
      });
  }, [currency, currencies, drawerOpen, editingId, financialSettings.baseCurrency]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    const normalized = form.name.trim();
    if (!normalized) {
      setDuplicateWarning(undefined);
      return;
    }
    const timer = setTimeout(() => {
      void fetchPartiesApi({ role: "customer", search: normalized, status: "ACTIVE" })
        .then((matches) => {
          const duplicate = matches.find(
            (item) => item.name.trim().toLowerCase() === normalized.toLowerCase() && item.id !== editingId
          );
          setDuplicateWarning(duplicate ? `Possible duplicate: ${duplicate.name}` : undefined);
        })
        .catch(() => setDuplicateWarning(undefined));
    }, 250);
    return () => clearTimeout(timer);
  }, [drawerOpen, form.name, editingId]);

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (form.creditLimit.trim()) {
      const value = Number(form.creditLimit);
      if (!Number.isFinite(value) || value < 0) nextErrors.creditLimit = "Credit limit must be a non-negative number.";
    }
    const code = form.defaultCurrency.trim().toUpperCase();
    if (code && !/^[A-Z]{3}$/.test(code)) nextErrors.defaultCurrency = "Currency must be a 3-letter code (e.g. KES).";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors.");
      return;
    }
    const payload: PartyPayload = {
      name: form.name.trim(),
      roles: ["customer"],
      email: form.email.trim() || undefined,
      creditLimit: form.creditLimit.trim() ? Number(form.creditLimit) : undefined,
      creditLimitAmount: form.creditLimit.trim() ? Number(form.creditLimit) : undefined,
      customerCategoryId: form.customerCategoryId || undefined,
      creditControlMode: form.creditControlMode,
      maxOutstandingInvoiceAgeDays: form.maxOutstandingInvoiceAgeDays.trim()
        ? Number(form.maxOutstandingInvoiceAgeDays)
        : undefined,
      perInvoiceDaysToPayCap: form.perInvoiceDaysToPayCap.trim() ? Number(form.perInvoiceDaysToPayCap) : undefined,
      creditWarningThresholdPct: form.creditWarningThresholdPct.trim()
        ? Number(form.creditWarningThresholdPct)
        : undefined,
      paymentTermsId: form.paymentTermsId || undefined,
      defaultCurrency: form.defaultCurrency.trim().toUpperCase() || undefined,
      taxId: form.taxId.trim() || undefined,
      status: "ACTIVE",
    };
    setSaving(true);
    try {
      if (editingId) {
        await updatePartyApi(editingId, payload);
        toast.success("Customer updated.");
      } else {
        await createPartyApi(payload);
        toast.success("Customer created.");
      }
      closeDrawer();
      await reload();
      onCustomerSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const code =
        name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 24) || "CATEGORY";
      const created = await createCustomerCategoryApi({ code, name });
      setCategories((prev) =>
        [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name))
      );
      setForm((prev) => ({ ...prev, customerCategoryId: created.id }));
      setNewCategoryName("");
      toast.success("Customer category created.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to create category.");
    }
  };

  const termById = React.useMemo(() => new Map(terms.map((t) => [t.id, t.name])), [terms]);
  const categoryById = React.useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Customer",
        accessor: (row: ArCustomerSummary) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {row.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium truncate">{row.name}</div>
              <div className="text-xs text-muted-foreground truncate">{row.email ?? row.code ?? ""}</div>
            </div>
          </div>
        ),
        sticky: true,
      },
      {
        id: "type",
        header: "Type",
        accessor: (row: ArCustomerSummary) =>
          row.customerType ? (
            <Badge variant="outline">{humanize(row.customerType)}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        id: "creditLimit",
        header: "Credit limit",
        accessor: (row: ArCustomerSummary) => {
          const amt = row.creditLimit ?? row.creditLimitAmount;
          return (
            <div className="text-right">{amt != null && Number.isFinite(amt) ? formatMoney(amt, currency) : "—"}</div>
          );
        },
      },
      {
        id: "outstanding",
        header: "Outstanding",
        accessor: (row: ArCustomerSummary) => {
          const amt = row.outstandingBalance ?? 0;
          return (
            <div className="text-right font-medium">{formatMoney(Number.isFinite(amt) ? amt : 0, currency)}</div>
          );
        },
      },
      {
        id: "paymentTerms",
        header: "Terms",
        accessor: (row: ArCustomerSummary) =>
          row.paymentTermsId ? termById.get(row.paymentTermsId) ?? "—" : "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (row: ArCustomerSummary) => <StatusBadge status={row.status ?? "ACTIVE"} />,
      },
      {
        id: "actions",
        header: "",
        accessor: (row: ArCustomerSummary) => (
          <RowActions
            actions={[
              {
                label: "Edit credit & billing",
                icon: "Pencil",
                onClick: () => {
                  setEditingId(row.id);
                  setDrawerOpen(true);
                  onEditCustomerIdChange?.(row.id);
                },
              },
              {
                label: "New sales order",
                icon: "ShoppingCart",
                onClick: () => router.push(`/docs/sales-order/new?party=${row.id}`),
              },
              {
                label: "AR aging",
                icon: "FileText",
                onClick: () => router.push("/ar/aging"),
              },
            ]}
          />
        ),
        className: "w-[50px]",
      },
    ],
    [currency, onEditCustomerIdChange, router, termById]
  );

  const openCreate = () => {
    if (onAddCustomer) {
      onAddCustomer();
      return;
    }
    if (creditFocused) {
      router.push("/sales/customers?new=1");
      return;
    }
    setEditingId(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <DataTableToolbar
        className="shrink-0"
        searchPlaceholder="Search by name or email…"
        searchValue={search}
        onSearchChange={setSearch}
        onExport={() =>
          downloadCsv(
            `customers-accounts-${new Date().toISOString().slice(0, 10)}.csv`,
            summaries.map((r) => ({
              name: r.name,
              email: r.email ?? "",
              customerType: r.customerType ?? "",
              category: r.customerCategoryId ? categoryById.get(r.customerCategoryId) ?? "" : "",
              creditLimit: r.creditLimit ?? r.creditLimitAmount ?? "",
              outstanding: r.outstandingBalance ?? "",
              paymentTerms: r.paymentTermsId ? termById.get(r.paymentTermsId) ?? "" : "",
              status: r.status ?? "",
            }))
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/settings/customizer/fields" className="text-sm text-muted-foreground hover:text-foreground">
              Custom fields
            </Link>
            {onAddCustomer || canWriteSales ? (
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                New customer
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={LIST_TABLE_SURFACE_CLASS}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Icons.Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : summaries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="Users"
              title="No customers yet"
              description={
                creditFocused
                  ? "Customers are created under Sales. Once they exist, you can set and raise credit here."
                  : "Add a customer first, then set credit when you sell on account."
              }
              action={
                onAddCustomer || canWriteSales
                  ? { label: "New customer", onClick: openCreate }
                  : undefined
              }
            />
          </div>
        ) : (
          <DataTable
            data={summaries}
            columns={columns}
            onRowClick={(row) => {
              setEditingId(row.id);
              setDrawerOpen(true);
              onEditCustomerIdChange?.(row.id);
            }}
            emptyMessage="No customers found."
            scrollMode="natural"
            size="comfortable"
          />
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
          else setDrawerOpen(true);
        }}
        title={editingId ? "Edit credit" : "New customer"}
        description={
          editingId
            ? "Update credit limit, payment terms, and billing settings for this existing customer."
            : "Create a customer. Prefer Sales → Customers for full setup; credit can still be set here."
        }
        mode={editingId ? "edit" : "create"}
        duplicateWarning={duplicateWarning}
        footer={
          <>
            <Button variant="outline" onClick={closeDrawer} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || (creditFocused && editingId ? !canEditCredit : !canWriteSales && !canEditCredit)}
            >
              {editingId ? "Save credit" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <KraTaxPinField value={form.taxId} onChange={(taxId) => setForm((prev) => ({ ...prev, taxId }))} />
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Customer name"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Credit settings</p>
            <div className="space-y-2">
              <Label>Credit limit</Label>
              <Input
                type="number"
                placeholder="Leave blank for no limit / cash only"
                value={form.creditLimit}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, creditLimit: e.target.value }));
                  if (errors.creditLimit) setErrors((prev) => ({ ...prev, creditLimit: "" }));
                }}
              />
              {errors.creditLimit ? <p className="text-xs text-destructive">{errors.creditLimit}</p> : null}
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
              <Label>Credit control mode</Label>
              <Select
                value={form.creditControlMode}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    creditControlMode: value as "AMOUNT" | "DAYS" | "HYBRID",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AMOUNT">Amount</SelectItem>
                  <SelectItem value="DAYS">Days</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Customer category</Label>
            <Select
              value={form.customerCategoryId || "__none__"}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, customerCategoryId: value === "__none__" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add new category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => void handleCreateCategory()}>
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Max outstanding invoice age (days)</Label>
            <Input
              type="number"
              placeholder="Optional"
              value={form.maxOutstandingInvoiceAgeDays}
              onChange={(e) => setForm((prev) => ({ ...prev, maxOutstandingInvoiceAgeDays: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Per-invoice days to pay cap</Label>
            <Input
              type="number"
              placeholder="Optional"
              value={form.perInvoiceDaysToPayCap}
              onChange={(e) => setForm((prev) => ({ ...prev, perInvoiceDaysToPayCap: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Credit warning threshold (%)</Label>
            <Input
              type="number"
              placeholder="e.g. 80"
              value={form.creditWarningThresholdPct}
              onChange={(e) => setForm((prev) => ({ ...prev, creditWarningThresholdPct: e.target.value }))}
            />
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
            {errors.defaultCurrency ? <p className="text-xs text-destructive">{errors.defaultCurrency}</p> : null}
          </div>
        </div>
      </EntityDrawer>
    </div>
  );
}
