"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  approveBudgetApi,
  createBudgetApi,
  fetchBudgetsApi,
  fetchBudgetVarianceApi,
  submitBudgetApi,
  updateBudgetApi,
  type BudgetRow,
} from "@/lib/api/budgets";
import { fetchFinancialCurrenciesApi } from "@/lib/api/financial-settings";
import { CURRENCY_LIST } from "@/lib/data/currencies";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BudgetsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<BudgetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetRow | null>(null);
  const [varianceOpen, setVarianceOpen] = React.useState(false);
  const [variance, setVariance] = React.useState<Awaited<ReturnType<typeof fetchBudgetVarianceApi>> | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    fiscalYear: String(new Date().getFullYear()),
    costCenter: "",
    branchId: "",
    currency: "KES",
    linesText: "6000,2026-01,100000\n6100,2026-01,50000",
  });
  const [currencies, setCurrencies] = React.useState<{ code: string; name: string }[]>(
    () => CURRENCY_LIST.map((c) => ({ code: c.code, name: c.name }))
  );

  React.useEffect(() => {
    if (!drawerOpen) return;
    fetchFinancialCurrenciesApi()
      .then((items) => setCurrencies(items.filter((c) => c.enabled).map((c) => ({ code: c.code, name: c.name ?? c.code }))))
      .catch(() => setCurrencies(CURRENCY_LIST.map((c) => ({ code: c.code, name: c.name }))));
  }, [drawerOpen]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchBudgetsApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.name, row.fiscalYear, row.status, row.costCenter ?? ""].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const parseLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [accountCode, period, amount, actualAmount] = line.split(",").map((part) => part.trim());
        return {
          accountCode,
          period,
          amount: Number(amount || "0"),
          actualAmount: actualAmount ? Number(actualAmount) : undefined,
        };
      })
      .filter((line) => line.accountCode && line.period);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      fiscalYear: String(new Date().getFullYear()),
      costCenter: "",
      branchId: "",
      currency: "KES",
      linesText: "6000,2026-01,100000\n6100,2026-01,50000",
    });
    setDrawerOpen(true);
  };

  const columns = React.useMemo(
    () => [
      { id: "name", header: "Budget", accessor: (row: BudgetRow) => <span className="font-medium">{row.name}</span> },
      { id: "fiscalYear", header: "Year", accessor: "fiscalYear" as keyof BudgetRow },
      { id: "costCenter", header: "Cost Center", accessor: (row: BudgetRow) => row.costCenter || "—" },
      { id: "status", header: "Status", accessor: "status" as keyof BudgetRow },
      { id: "totalBudget", header: "Total", accessor: (row: BudgetRow) => formatMoney(row.totalBudget ?? 0, row.currency || "KES") },
      {
        id: "actions",
        header: "Actions",
        accessor: (row: BudgetRow) => (
          <div className="flex items-center gap-2">
            {row.status === "DRAFT" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await submitBudgetApi(row.id);
                    toast.success("Budget submitted.");
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to submit budget.");
                  }
                }}
              >
                Submit
              </Button>
            ) : null}
            {row.status === "SUBMITTED" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await approveBudgetApi(row.id);
                    toast.success("Budget approved.");
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to approve budget.");
                  }
                }}
              >
                Approve
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const variancePayload = await fetchBudgetVarianceApi(row.id);
                  setVariance(variancePayload);
                  setVarianceOpen(true);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to load budget variance.");
                }
              }}
            >
              Variance
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(row);
                setForm((prev) => ({
                  ...prev,
                  name: row.name,
                  fiscalYear: row.fiscalYear,
                  costCenter: row.costCenter || "",
                  branchId: row.branchId || "",
                  currency: row.currency || "KES",
                }));
                setDrawerOpen(true);
              }}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [refresh]
  );

  return (
    <PageShell>
      <PageHeader
        title="Budgets"
        description="Create, submit, approve, and review budget variance."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Budgets" }]}
        actions={
          <Button onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar searchPlaceholder="Search budgets..." searchValue={search} onSearchChange={setSearch} />
        <Card>
          <CardHeader><CardTitle>Budgets</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading budgets...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon="Target" title="No budgets" description="Create budgets to track performance against targets." action={{ label: "Create Budget", onClick: openCreate }} />
              </div>
            ) : (
              <DataTable<BudgetRow> data={filtered} columns={columns} emptyMessage="No budgets found." />
            )}
          </CardContent>
        </Card>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? "Edit budget" : "Create budget"}</h2>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fiscal Year</Label>
                  <Input value={form.fiscalYear} onChange={(event) => setForm((prev) => ({ ...prev, fiscalYear: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((prev) => ({ ...prev, currency: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} {c.name !== c.code ? `— ${c.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cost center</Label>
                  <Input value={form.costCenter} onChange={(event) => setForm((prev) => ({ ...prev, costCenter: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Branch ID</Label>
                  <Input value={form.branchId} onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lines CSV (`accountCode,period,amount,actualAmount?` per line)</Label>
                <textarea
                  className="min-h-40 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  value={form.linesText}
                  onChange={(event) => setForm((prev) => ({ ...prev, linesText: event.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!form.name.trim() || !form.fiscalYear.trim()) {
                      toast.error("Name and fiscal year are required.");
                      return;
                    }
                    const payload = {
                      name: form.name.trim(),
                      fiscalYear: form.fiscalYear.trim(),
                      costCenter: form.costCenter.trim() || undefined,
                      branchId: form.branchId.trim() || undefined,
                      currency: form.currency.trim() || "KES",
                      lines: parseLines(form.linesText),
                    };
                    try {
                      if (editing) {
                        await updateBudgetApi(editing.id, payload);
                        toast.success("Budget updated.");
                      } else {
                        await createBudgetApi(payload);
                        toast.success("Budget created.");
                      }
                      setDrawerOpen(false);
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to save budget.");
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

      {varianceOpen && variance ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="ml-auto h-full w-full max-w-xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Budget variance - {variance.name}</h2>
            <p className="text-sm text-muted-foreground">Status: {variance.status}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded border p-3">Budget: {formatMoney(variance.totals.budgetAmount, "KES")}</div>
              <div className="rounded border p-3">Actual: {formatMoney(variance.totals.actualAmount, "KES")}</div>
              <div className="rounded border p-3">Variance: {formatMoney(variance.totals.variance, "KES")}</div>
            </div>
            <div className="mt-4 max-h-[50vh] space-y-2 overflow-auto">
              {variance.lines.map((line, index) => (
                <div key={`${line.accountCode}-${line.period}-${index}`} className="rounded border p-3 text-sm">
                  <p className="font-medium">{line.accountCode} - {line.period}</p>
                  <p className="text-muted-foreground">
                    Budget {formatMoney(line.budgetAmount, "KES")} / Actual {formatMoney(line.actualAmount, "KES")} / Var {formatMoney(line.variance, "KES")}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setVarianceOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
