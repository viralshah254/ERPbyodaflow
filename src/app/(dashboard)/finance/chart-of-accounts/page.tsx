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
import { createFinanceAccountApi, fetchFinanceAccountsApi, type FinanceAccount } from "@/lib/api/finance";
import { uploadFile, isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ChartOfAccountsPage() {
  const [rows, setRows] = React.useState<FinanceAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    type: "ASSET",
    currency: "KES",
  });

  const refresh = React.useCallback(async () => {
    setRows(await fetchFinanceAccountsApi());
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message || "Failed to load accounts."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "code", header: "Code", accessor: (row: FinanceAccount) => <span className="font-medium">{row.code}</span>, sticky: true },
      { id: "name", header: "Name", accessor: "name" as keyof FinanceAccount },
      { id: "type", header: "Type", accessor: "type" as keyof FinanceAccount },
    ],
    []
  );

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
            <Button onClick={() => setCreateOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by code, name, type..."
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
              emptyMessage="No accounts found."
            />
          )}
        </CardContent>
      </Card>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add ledger account</SheetTitle>
            <SheetDescription>Create a live chart-of-accounts entry.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="e.g. 1120" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Main Bank" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value.toUpperCase() }))} placeholder="ASSET / LIABILITY / EXPENSE" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} placeholder="KES" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  await createFinanceAccountApi(form);
                  await refresh();
                  setCreateOpen(false);
                  setForm({ code: "", name: "", type: "ASSET", currency: "KES" });
                  toast.success("Account created.");
                } catch (error) {
                  toast.error((error as Error).message || "Failed to create account.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
