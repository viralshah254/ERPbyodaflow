"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchArCustomerSummariesApi } from "@/lib/api/payments";
import { fetchPaymentTermsApi } from "@/lib/api/payment-terms";
import { createCustomerCategoryApi, fetchCustomerCategoriesApi } from "@/lib/api/customer-categories";
import {
  createPartyApi,
  fetchPartiesApi,
  fetchPartyByIdApi,
  updatePartyApi,
  type PartyPayload,
} from "@/lib/api/parties";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ARCustomerRow = {
  id: string;
  name: string;
  email?: string;
  creditLimit?: number;
  creditControlMode?: "AMOUNT" | "DAYS" | "HYBRID";
  customerCategoryId?: string;
  customerCategory?: string;
  maxOutstandingInvoiceAgeDays?: number;
  perInvoiceDaysToPayCap?: number;
  paymentTermsId?: string;
  paymentTerms?: string;
  status?: string;
};

export default function ARCustomersPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [allRows, setAllRows] = React.useState<ARCustomerRow[]>([]);
  const [terms, setTerms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
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
  const requestedCustomerId = searchParams.get("id");

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const reload = React.useCallback(async () => {
    const [customers, termsData, categoriesData] = await Promise.all([
      fetchArCustomerSummariesApi(debouncedSearch),
      fetchPaymentTermsApi(),
      fetchCustomerCategoriesApi(),
    ]);
    const termById = new Map(termsData.map((term) => [term.id, term.name]));
    const categoryById = new Map(categoriesData.map((category) => [category.id, category.name]));
    setTerms(termsData.map((term) => ({ id: term.id, name: term.name })));
    setCategories(categoriesData.filter((item) => item.isActive).map((item) => ({ id: item.id, name: item.name })));
    setAllRows(
      customers.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        creditLimit: item.creditLimit,
        creditControlMode: item.creditControlMode,
        customerCategoryId: item.customerCategoryId,
        customerCategory: item.customerCategoryId ? categoryById.get(item.customerCategoryId) ?? item.customerCategoryId : undefined,
        maxOutstandingInvoiceAgeDays: item.maxOutstandingInvoiceAgeDays,
        perInvoiceDaysToPayCap: item.perInvoiceDaysToPayCap,
        paymentTermsId: item.paymentTermsId,
        paymentTerms: item.paymentTermsId ? termById.get(item.paymentTermsId) ?? item.paymentTermsId : undefined,
        status: item.status ?? "ACTIVE",
      }))
    );
  }, [debouncedSearch]);

  React.useEffect(() => {
    void reload().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to load AR customers.");
    });
  }, [reload]);

  React.useEffect(() => {
    if (!requestedCustomerId || allRows.length === 0 || drawerOpen) return;
    const match = allRows.find((row) => row.id === requestedCustomerId);
    if (match) {
      setEditingId(match.id);
      setDrawerOpen(true);
    }
  }, [allRows, drawerOpen, requestedCustomerId]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    if (!editingId) {
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
        defaultCurrency: "KES",
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
            party.creditLimit != null && Number.isFinite(party.creditLimit)
              ? String(party.creditLimit)
              : "",
          paymentTermsId: party.paymentTermsId ?? "",
          customerCategoryId: party.customerCategoryId ?? "",
          creditControlMode: party.creditControlMode ?? "AMOUNT",
          maxOutstandingInvoiceAgeDays:
            party.maxOutstandingInvoiceAgeDays != null ? String(party.maxOutstandingInvoiceAgeDays) : "",
          perInvoiceDaysToPayCap:
            party.perInvoiceDaysToPayCap != null ? String(party.perInvoiceDaysToPayCap) : "",
          creditWarningThresholdPct:
            party.creditWarningThresholdPct != null ? String(party.creditWarningThresholdPct) : "",
          defaultCurrency: party.defaultCurrency ?? "KES",
          taxId: party.taxId ?? "",
        });
        setErrors({});
        setDuplicateWarning(undefined);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load customer details.");
      });
  }, [drawerOpen, editingId]);

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
    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (form.creditLimit.trim()) {
      const value = Number(form.creditLimit);
      if (!Number.isFinite(value) || value < 0) {
        nextErrors.creditLimit = "Credit limit must be a non-negative number.";
      }
    }
    const currency = form.defaultCurrency.trim().toUpperCase();
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      nextErrors.defaultCurrency = "Currency must be a 3-letter code (e.g. KES).";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors.");
      return;
    }
    const termNameById = new Map(terms.map((term) => [term.id, term.name]));
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
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
      creditWarningThresholdPct: form.creditWarningThresholdPct.trim() ? Number(form.creditWarningThresholdPct) : undefined,
      paymentTermsId: form.paymentTermsId || undefined,
      defaultCurrency: form.defaultCurrency.trim().toUpperCase() || undefined,
      taxId: form.taxId.trim() || undefined,
      status: "ACTIVE",
    };
    const optimisticId = editingId ?? `optimistic-customer-${Date.now()}`;
    const optimisticRow: ARCustomerRow = {
      id: optimisticId,
      name: payload.name,
      email: payload.email,
      creditLimit: payload.creditLimit,
      creditControlMode: payload.creditControlMode,
      customerCategoryId: payload.customerCategoryId,
      customerCategory: payload.customerCategoryId ? categoryNameById.get(payload.customerCategoryId) ?? payload.customerCategoryId : undefined,
      maxOutstandingInvoiceAgeDays: payload.maxOutstandingInvoiceAgeDays,
      perInvoiceDaysToPayCap: payload.perInvoiceDaysToPayCap,
      paymentTermsId: payload.paymentTermsId,
      paymentTerms: payload.paymentTermsId ? termNameById.get(payload.paymentTermsId) ?? payload.paymentTermsId : undefined,
      status: payload.status ?? "ACTIVE",
    };
    setSaving(true);
    setAllRows((prev) => {
      if (editingId) return prev.map((row) => (row.id === editingId ? optimisticRow : row));
      return [optimisticRow, ...prev];
    });
    setDrawerOpen(false);
    setEditingId(null);
    try {
      if (editingId) {
        await updatePartyApi(editingId, payload);
        toast.success("Customer updated.");
      } else {
        await createPartyApi(payload);
        toast.success("Customer created.");
      }
      await reload();
    } catch (err) {
      await reload();
      toast.error(err instanceof Error ? err.message : "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "CATEGORY";
      const created = await createCustomerCategoryApi({ code, name });
      setCategories((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((prev) => ({ ...prev, customerCategoryId: created.id }));
      setNewCategoryName("");
      toast.success("Customer category created.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to create category.");
    }
  };
  const filtered = React.useMemo(() => {
    return allRows;
  }, [allRows]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r: ARCustomerRow) => <span className="font-medium">{r.name}</span>,
        sticky: true,
      },
      { id: "email", header: "Email", accessor: "email" as keyof ARCustomerRow },
      {
        id: "customerCategory",
        header: "Category",
        accessor: (r: ARCustomerRow) => r.customerCategory ?? "—",
      },
      {
        id: "creditLimit",
        header: "Credit limit",
        accessor: (r: ARCustomerRow) =>
          r.creditLimit != null ? formatMoney(r.creditLimit, "KES") : "—",
      },
      { id: "paymentTerms", header: "Payment terms", accessor: "paymentTerms" as keyof ARCustomerRow },
      { id: "creditControlMode", header: "Credit mode", accessor: (r: ARCustomerRow) => r.creditControlMode ?? "—" },
      {
        id: "status",
        header: "Status",
        accessor: (r: ARCustomerRow) => <StatusBadge status={r.status ?? "ACTIVE"} />,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="AR Customers"
        description="Customers with credit limit, payment terms, and AR settings"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AR Customers" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => { setEditingId(null); setDrawerOpen(true); }}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add customer
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search customers..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => toast.info("Export endpoint pending wiring.")}
          actions={
            <Link
              href="/settings/customizer/fields"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Custom fields
            </Link>
          }
        />
        {filtered.length === 0 ? (
          <EmptyState
            icon="Users"
            title="No AR customers"
            description="Add customers with credit limit and payment terms."
            action={{
              label: "Add customer",
              onClick: () => setDrawerOpen(true),
            }}
          />
        ) : (
          <DataTable<ARCustomerRow>
            data={filtered}
            columns={columns}
            onRowClick={(row) => {
              setEditingId(row.id);
              setDrawerOpen(true);
            }}
            emptyMessage="No customers found."
          />
        )}
      </div>

      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? "Edit AR customer" : "New AR customer"}
            description={editingId ? "Update customer and AR settings." : "Add customer with credit limit and payment terms."}
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
          <div className="space-y-2">
            <Label>Credit limit</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.creditLimit}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, creditLimit: e.target.value }));
                if (errors.creditLimit) setErrors((prev) => ({ ...prev, creditLimit: "" }));
              }}
            />
            {errors.creditLimit ? <p className="text-xs text-destructive">{errors.creditLimit}</p> : null}
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
            <Input
              placeholder="e.g. KES"
              value={form.defaultCurrency}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
                setForm((prev) => ({ ...prev, defaultCurrency: value }));
                if (errors.defaultCurrency) setErrors((prev) => ({ ...prev, defaultCurrency: "" }));
              }}
            />
            {errors.defaultCurrency ? <p className="text-xs text-destructive">{errors.defaultCurrency}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Tax PIN</Label>
            <Input
              placeholder="Optional"
              value={form.taxId}
              onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))}
            />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
