"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchApSupplierSummariesApi } from "@/lib/api/payments";
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
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type APSupplierRow = {
  id: string;
  name: string;
  email?: string;
  paymentTermsId?: string;
  paymentTerms?: string;
  status?: string;
};

export default function APSuppliersPage() {
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [allRows, setAllRows] = React.useState<APSupplierRow[]>([]);
  const [terms, setTerms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [currencies, setCurrencies] = React.useState<Array<{ id: string; code: string; name: string; isBaseCurrency?: boolean }>>([]);
  const { settings: financialSettings } = useFinancialSettings();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    paymentTermsId: "",
    defaultCurrency: "KES",
    taxId: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | undefined>(undefined);

  const reload = React.useCallback(async () => {
    const [suppliers, termsData, currenciesData] = await Promise.all([
      fetchApSupplierSummariesApi(),
      fetchPaymentTermsApi(),
      fetchFinancialCurrenciesApi(),
    ]);
    const termById = new Map(termsData.map((term) => [term.id, term.name]));
    setTerms(termsData.map((term) => ({ id: term.id, name: term.name })));
    setCurrencies(currenciesData.filter((c) => c.enabled).map((c) => ({ id: c.code, code: c.code, name: c.name ?? c.code, isBaseCurrency: c.isBaseCurrency })));
    setAllRows(
      suppliers.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        paymentTermsId: item.paymentTermsId,
        paymentTerms: item.paymentTermsId ? termById.get(item.paymentTermsId) ?? item.paymentTermsId : undefined,
        status: item.status ?? "ACTIVE",
      }))
    );
  }, []);

  React.useEffect(() => {
    void reload().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to load AP suppliers.");
    });
  }, [reload]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    if (!editingId) {
      const baseCode = financialSettings.baseCurrency || currencies.find((c) => c.isBaseCurrency)?.code || currencies[0]?.code || "KES";
      setForm({
        name: "",
        email: "",
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
  }, [drawerOpen, editingId]);

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
    const payload: PartyPayload = {
      name: form.name.trim(),
      roles: ["supplier"],
      email: form.email.trim() || undefined,
      paymentTermsId: form.paymentTermsId || undefined,
      defaultCurrency: form.defaultCurrency.trim().toUpperCase() || undefined,
      taxId: form.taxId.trim() || undefined,
      status: "ACTIVE",
    };
    const optimisticId = editingId ?? `optimistic-supplier-${Date.now()}`;
    const optimisticRow: APSupplierRow = {
      id: optimisticId,
      name: payload.name,
      email: payload.email,
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
        toast.success("Supplier updated.");
      } else {
        await createPartyApi(payload);
        toast.success("Supplier created.");
      }
      await reload();
    } catch (err) {
      await reload();
      toast.error(err instanceof Error ? err.message : "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  };
  const filtered = React.useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q))
    );
  }, [allRows, search]);

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r: APSupplierRow) => <span className="font-medium">{r.name}</span>,
        sticky: true,
      },
      { id: "email", header: "Email", accessor: "email" as keyof APSupplierRow },
      { id: "paymentTerms", header: "Payment terms", accessor: "paymentTerms" as keyof APSupplierRow },
      {
        id: "status",
        header: "Status",
        accessor: (r: APSupplierRow) => <StatusBadge status={r.status ?? "ACTIVE"} />,
      },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="AP Suppliers"
        description="Suppliers and payment terms"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP Suppliers" },
        ]}
        sticky
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
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search suppliers..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() =>
            downloadCsv(
              `ap-suppliers-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered.map((r) => ({
                name: r.name,
                email: r.email ?? "",
                paymentTerms: r.paymentTerms ?? "",
                status: r.status ?? "",
              }))
            )
          }
        />
        <DataTable<APSupplierRow>
          data={filtered}
          columns={columns}
          onRowClick={(row) => {
            setEditingId(row.id);
            setDrawerOpen(true);
          }}
          emptyMessage="No suppliers found."
        />
      </div>
      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? "Edit AP supplier" : "New AP supplier"}
        description={editingId ? "Update supplier and payment settings." : "Add supplier with payment terms."}
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
            <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Payment terms</Label>
            <Select
              value={form.paymentTermsId || "__none__"}
              onValueChange={(value) => setForm((prev) => ({ ...prev, paymentTermsId: value === "__none__" ? "" : value }))}
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
              value={form.defaultCurrency && currencies.some((c) => c.code === form.defaultCurrency) ? form.defaultCurrency : (currencies[0]?.code ?? form.defaultCurrency ?? "")}
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
          <div className="space-y-2">
            <Label>Tax PIN</Label>
            <Input value={form.taxId} onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))} />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
