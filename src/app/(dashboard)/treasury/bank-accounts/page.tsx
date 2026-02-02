"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMockBankAccounts, type BankAccountRow } from "@/lib/mock/treasury/bank-accounts";
import { getMockCOARootFirst } from "@/lib/mock/coa";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

export default function BankAccountsPage() {
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BankAccountRow | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    accountNumber: "",
    bank: "",
    branch: "",
    currency: "KES",
    glAccountCode: "",
    active: true,
  });

  const rows = React.useMemo(() => getMockBankAccounts(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.bank.toLowerCase().includes(q) ||
        r.accountNumber.toLowerCase().includes(q)
    );
  }, [rows, search]);
  const coa = React.useMemo(() => getMockCOARootFirst().filter((r) => r.type === "Asset"), []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      accountNumber: "",
      bank: "",
      branch: "",
      currency: "KES",
      glAccountCode: "",
      active: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (r: BankAccountRow) => {
    setEditing(r);
    setForm({
      name: r.name,
      accountNumber: r.accountNumber,
      bank: r.bank,
      branch: r.branch ?? "",
      currency: r.currency,
      glAccountCode: r.glAccountCode ?? "",
      active: r.active,
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Name", accessor: (r: BankAccountRow) => <span className="font-medium">{r.name}</span>, sticky: true },
      { id: "accountNumber", header: "Account", accessor: "accountNumber" as keyof BankAccountRow },
      { id: "bank", header: "Bank", accessor: "bank" as keyof BankAccountRow },
      { id: "currency", header: "Currency", accessor: "currency" as keyof BankAccountRow },
      { id: "gl", header: "GL account", accessor: (r: BankAccountRow) => r.glAccountCode ? `${r.glAccountCode} — ${r.glAccountName ?? ""}` : "—" },
      { id: "active", header: "Active", accessor: (r: BankAccountRow) => (r.active ? "Yes" : "No") },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Bank accounts"
        description="Manage bank accounts, GL mapping"
        breadcrumbs={[
          { label: "Treasury", href: "/treasury/overview" },
          { label: "Bank accounts" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain bank account setup and GL mapping." label="Explain bank accounts" />
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add account
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by name, bank, account..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Account name/number, bank, branch, currency, GL mapping. Enable/disable.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<BankAccountRow>
              data={filtered}
              columns={columns}
              onRowClick={(row) => openEdit(row)}
              emptyMessage="No bank accounts."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit account" : "Add account"}</SheetTitle>
            <SheetDescription>Stub — no persist.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Account name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Operating KES" />
            </div>
            <div className="space-y-2">
              <Label>Account number</Label>
              <Input value={form.accountNumber} onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="Last 4 digits or full" />
            </div>
            <div className="space-y-2">
              <Label>Bank</Label>
              <Input value={form.bank} onChange={(e) => setForm((p) => ({ ...p, bank: e.target.value }))} placeholder="e.g. KCB" />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input value={form.branch} onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GL account</Label>
              <Select value={form.glAccountCode} onValueChange={(v) => setForm((p) => ({ ...p, glAccountCode: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {coa.map((r) => (
                    <SelectItem key={r.id} value={r.code}>{r.code} — {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={form.active} onCheckedChange={(c) => setForm((p) => ({ ...p, active: c === true }))} />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={() => setDrawerOpen(false)}>{editing ? "Save" : "Create"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
