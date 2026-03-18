"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createFinanceAccountApi,
  deleteFinanceAccountApi,
  fetchFinanceAccountsApi,
  updateFinanceAccountApi,
  type FinanceAccount,
} from "@/lib/api/finance";
import { fetchFinancialCurrenciesApi } from "@/lib/api/financial-settings";
import { CURRENCY_LIST } from "@/lib/data/currencies";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ChartOfAccountsPage() {
  const [rows, setRows] = React.useState<FinanceAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FinanceAccount | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<FinanceAccount | null>(null);
  const [saving, setSaving] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = React.useState<{
    code: string;
    name: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
    currency: string;
    parentId: string;
    description: string;
  }>({
    code: "",
    name: "",
    type: "ASSET",
    currency: "KES",
    parentId: "",
    description: "",
  });
  const [currencies, setCurrencies] = React.useState<{ code: string; name: string }[]>(
    () => CURRENCY_LIST.map((c) => ({ code: c.code, name: c.name }))
  );

  const sheetOpen = createOpen || !!editing;
  const isEditMode = !!editing;

  React.useEffect(() => {
    if (!sheetOpen) return;
    fetchFinancialCurrenciesApi()
      .then((items) => setCurrencies(items.filter((c) => c.enabled).map((c) => ({ code: c.code, name: c.name ?? c.code }))))
      .catch(() => setCurrencies(CURRENCY_LIST.map((c) => ({ code: c.code, name: c.name }))));
  }, [sheetOpen]);

  const refresh = React.useCallback(async () => {
    setRows(await fetchFinanceAccountsApi());
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message || "Failed to load accounts."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const accountById = React.useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        (row.currency ?? "").toLowerCase().includes(q) ||
        (accountById.get(row.parentId ?? "")?.code ?? "").toLowerCase().includes(q) ||
        (accountById.get(row.parentId ?? "")?.name ?? "").toLowerCase().includes(q)
    );
  }, [rows, search, accountById]);

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (row: FinanceAccount) => <span className="font-medium">{row.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof FinanceAccount },
      { id: "type", header: "Type", accessor: "type" as keyof FinanceAccount },
      {
        id: "currency",
        header: "Currency",
        accessor: (row: FinanceAccount) => row.currency ?? "—",
      },
      {
        id: "parent",
        header: "Parent",
        accessor: (row: FinanceAccount) => {
          if (!row.parentId) return "—";
          const parent = accountById.get(row.parentId);
          return parent ? `${parent.code} — ${parent.name}` : row.parentId;
        },
      },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: FinanceAccount) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                setAccountToDelete(row);
                setDeleteConfirmOpen(true);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [accountById]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", type: "ASSET", currency: "KES", parentId: "", description: "" });
    setCreateOpen(true);
  };

  const openEdit = (row: FinanceAccount) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      type: (["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(row.type) ? row.type : "ASSET") as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE",
      currency: row.currency || "KES",
      parentId: row.parentId || "",
      description: row.description || "",
    });
  };

  const handleImportCsv = () => {
    if (isApiConfigured()) {
      importInputRef.current?.click();
      return;
    }
    toast.info("Import COA: set NEXT_PUBLIC_API_URL to use backend.");
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(
      "/api/import/coa",
      file,
      (data) => {
        if (data.imported != null) toast.success(`Imported ${data.imported} account(s).`);
        else if (data.jobId) toast.success("Import queued. " + (data.message ?? ""));
        else toast.success("Import completed.");
        void refresh();
      },
      (msg) => toast.error(msg)
    );
  };

  return (
    <PageShell>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onImportFile}
      />
      <PageHeader
        title="Chart of Accounts"
        description="Manage your live ledger account structure"
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Chart of Accounts" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImportCsv}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import COA
            </Button>
            <Button onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by code, name, type, currency..."
          searchValue={search}
          onSearchChange={setSearch}
        />
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded border p-6 text-sm text-muted-foreground">Loading ledger accounts...</div>
          ) : (
            <DataTable<FinanceAccount>
              data={filtered}
              columns={columns}
              onRowClick={(row) => openEdit(row)}
              emptyMessage="No accounts found."
            />
          )}
        </CardContent>
      </Card>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit ledger account" : "Add ledger account"}</SheetTitle>
            <SheetDescription>
              {isEditMode ? "Update ledger account details." : "Create a live chart-of-accounts entry."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="e.g. 1120" />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this account. Use numeric or alphanumeric codes (e.g. 1000 for Cash, 5000 for Rent Expense).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Main Bank" />
              <p className="text-xs text-muted-foreground">
                Descriptive name shown in reports and when selecting accounts (e.g. Accounts Receivable, Office Supplies, Sales Revenue).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v as "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSET">ASSET</SelectItem>
                  <SelectItem value="LIABILITY">LIABILITY</SelectItem>
                  <SelectItem value="EQUITY">EQUITY</SelectItem>
                  <SelectItem value="REVENUE">REVENUE</SelectItem>
                  <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Primary category for financial statements. Assets and Expenses normally have debit balances; Liabilities, Equity, and Revenue have credit balances.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Parent account</Label>
              <Select
                value={form.parentId || "__none__"}
                onValueChange={(v) => setForm((prev) => ({ ...prev, parentId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {rows
                    .filter((r) => r.id !== editing?.id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.code} — {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional. Group this account under a parent for hierarchy (e.g. Petty Cash under Cash & Bank).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency || "__none__"}
                onValueChange={(v) => setForm((prev) => ({ ...prev, currency: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} {c.name !== c.code ? `— ${c.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default currency for balances in this account. Leave empty for multi-currency or functional currency.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Main operating bank account for receipts and payments"
              />
              <p className="text-xs text-muted-foreground">
                Optional notes on the account&apos;s purpose or usage. Helps your team understand when to use this account.
              </p>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditing(null); }}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  if (isEditMode && editing) {
                    await updateFinanceAccountApi(editing.id, {
                      code: form.code,
                      name: form.name,
                      type: form.type,
                      parentId: form.parentId || undefined,
                      currency: form.currency || undefined,
                      description: form.description.trim() || undefined,
                    });
                    toast.success("Account updated.");
                  } else {
                    await createFinanceAccountApi({
                      code: form.code,
                      name: form.name,
                      type: form.type,
                      parentId: form.parentId || undefined,
                      currency: form.currency || undefined,
                      description: form.description.trim() || undefined,
                    });
                    toast.success("Account created.");
                  }
                  await refresh();
                  setCreateOpen(false);
                  setEditing(null);
                  setForm({ code: "", name: "", type: "ASSET", currency: "KES", parentId: "", description: "" });
                } catch (error) {
                  toast.error((error as Error).message || "Failed to save account.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : isEditMode ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete ledger account"
        description={
          accountToDelete
            ? `Are you sure you want to delete "${accountToDelete.code} — ${accountToDelete.name}"? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!accountToDelete) return;
          try {
            await deleteFinanceAccountApi(accountToDelete.id);
            toast.success("Account deleted.");
            await refresh();
            setAccountToDelete(null);
          } catch (error) {
            toast.error((error as Error).message || "Failed to delete account.");
          }
        }}
      />
    </PageShell>
  );
}
