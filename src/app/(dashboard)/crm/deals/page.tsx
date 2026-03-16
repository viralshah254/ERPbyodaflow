"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCrmDealApi,
  deleteCrmDealApi,
  fetchCrmAccountsApi,
  fetchCrmDealsApi,
  transitionCrmDealStageApi,
  updateCrmDealApi,
  type CrmAccountRow,
  type CrmDealRow,
} from "@/lib/api/crm";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CRMDealsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<CrmDealRow[]>([]);
  const [accounts, setAccounts] = React.useState<CrmAccountRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CrmDealRow | null>(null);
  const [form, setForm] = React.useState({
    accountId: "",
    name: "",
    stage: "lead",
    amount: "",
    expectedCloseDate: "",
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [deals, accountRows] = await Promise.all([fetchCrmDealsApi(), fetchCrmAccountsApi()]);
      setRows(deals);
      setAccounts(accountRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const accountNameById = React.useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.stage ?? "", accountNameById.get(row.accountId) ?? ""].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search, accountNameById]);

  const openCreate = () => {
    setEditing(null);
    setForm({ accountId: "", name: "", stage: "lead", amount: "", expectedCloseDate: "" });
    setDrawerOpen(true);
  };

  const openEdit = (row: CrmDealRow) => {
    setEditing(row);
    setForm({
      accountId: row.accountId,
      name: row.name,
      stage: row.stage ?? "lead",
      amount: row.amount != null ? String(row.amount) : "",
      expectedCloseDate: row.expectedCloseDate ? String(row.expectedCloseDate).slice(0, 10) : "",
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Deal", accessor: (row: CrmDealRow) => <span className="font-medium">{row.name}</span> },
      { id: "account", header: "Account", accessor: (row: CrmDealRow) => accountNameById.get(row.accountId) ?? row.accountId },
      { id: "stage", header: "Stage", accessor: (row: CrmDealRow) => row.stage ?? "lead" },
      { id: "amount", header: "Amount", accessor: (row: CrmDealRow) => (row.amount != null ? row.amount.toLocaleString() : "—") },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: CrmDealRow) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await transitionCrmDealStageApi(row.id, "won");
                  toast.success("Deal marked as won.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to transition deal stage.");
                }
              }}
            >
              Mark won
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteCrmDealApi(row.id);
                  toast.success("Deal deleted.");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete deal.");
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [accountNameById, refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Deals / Opportunities"
        description="Manage pipeline stages, ownership, and close forecasts."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Deals" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Deal
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search deals..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader>
            <CardTitle>Deals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading deals...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="TrendingUp" title="No deals" description="Track sales opportunities and deals here." action={{ label: "Create Deal", onClick: openCreate }} />
              </div>
            ) : (
              <DataTable<CrmDealRow> data={filtered} columns={columns} onRowClick={openEdit} emptyMessage="No deals found." />
            )}
          </CardContent>
        </Card>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-md bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? "Edit deal" : "Create deal"}</h2>
            <p className="text-sm text-muted-foreground">Capture pipeline and close details.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={form.accountId || "__none__"} onValueChange={(value) => setForm((prev) => ({ ...prev, accountId: value === "__none__" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deal name</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Input value={form.stage} onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expected close date</Label>
                <Input type="date" value={form.expectedCloseDate} onChange={(event) => setForm((prev) => ({ ...prev, expectedCloseDate: event.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!form.accountId || !form.name.trim()) {
                      toast.error("Account and deal name are required.");
                      return;
                    }
                    const payload = {
                      accountId: form.accountId,
                      name: form.name.trim(),
                      stage: form.stage.trim(),
                      amount: form.amount.trim() ? Number(form.amount) : undefined,
                      expectedCloseDate: form.expectedCloseDate || undefined,
                    };
                    try {
                      if (editing) {
                        await updateCrmDealApi(editing.id, payload);
                        toast.success("Deal updated.");
                      } else {
                        await createCrmDealApi(payload);
                        toast.success("Deal created.");
                      }
                      setDrawerOpen(false);
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to save deal.");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
