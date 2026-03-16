"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityDrawer } from "@/components/masters/EntityDrawer";
import {
  createIntercompanyTransactionApi,
  fetchIntercompanyConsolidationApi,
  fetchIntercompanyEntitiesApi,
  fetchIntercompanyTransactionsApi,
} from "@/lib/api/intercompany";
import type { ICTransactionRow } from "@/lib/types/intercompany";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function IntercompanyTransactionsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<ICTransactionRow[]>([]);
  const [entities, setEntities] = React.useState<Array<{ id: string; name: string }>>([]);
  const [consolidation, setConsolidation] = React.useState<Array<{ currency: string; amount: number }>>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [creatingType, setCreatingType] = React.useState<"IC_INVOICE" | "IC_BILL">("IC_INVOICE");
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    fromEntityId: "",
    toEntityId: "",
    amount: "",
    currency: "USD",
    date: "",
    reference: "",
  });

  const reload = React.useCallback(async () => {
    const [transactionItems, entityItems, consolidationItems] = await Promise.all([
      fetchIntercompanyTransactionsApi(),
      fetchIntercompanyEntitiesApi(),
      fetchIntercompanyConsolidationApi(),
    ]);
    setRows(transactionItems);
    setEntities(entityItems.map((item) => ({ id: item.id, name: item.name })));
    setConsolidation(consolidationItems);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load intercompany transactions.");
    });
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.fromEntityName.toLowerCase().includes(q) ||
        r.toEntityName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns = React.useMemo(
    () => [
      { id: "number", header: "Number", accessor: (r: ICTransactionRow) => <span className="font-medium">{r.number}</span>, sticky: true },
      { id: "type", header: "Type", accessor: (r: ICTransactionRow) => r.type.replace("_", " ") },
      { id: "date", header: "Date", accessor: "date" as keyof ICTransactionRow },
      { id: "from", header: "From", accessor: "fromEntityName" as keyof ICTransactionRow },
      { id: "to", header: "To", accessor: "toEntityName" as keyof ICTransactionRow },
      { id: "amount", header: "Amount", accessor: (r: ICTransactionRow) => formatMoney(r.amount, r.currency) },
      { id: "status", header: "Status", accessor: (r: ICTransactionRow) => <Badge variant={r.status === "POSTED" ? "secondary" : "outline"}>{r.status}</Badge> },
    ],
    []
  );

  const openCreate = (type: "IC_INVOICE" | "IC_BILL") => {
    setCreatingType(type);
    setForm({
      fromEntityId: "",
      toEntityId: "",
      amount: "",
      currency: "USD",
      date: new Date().toISOString().slice(0, 10),
      reference: "",
    });
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    if (!form.fromEntityId || !form.toEntityId || !form.amount) {
      toast.error("From entity, to entity, and amount are required.");
      return;
    }
    setSaving(true);
    try {
      await createIntercompanyTransactionApi({
        type: creatingType,
        fromEntityId: form.fromEntityId,
        toEntityId: form.toEntityId,
        amount: Number(form.amount),
        currency: form.currency,
        date: form.date || new Date().toISOString().slice(0, 10),
        reference: form.reference || undefined,
      });
      setDrawerOpen(false);
      await reload();
      toast.success("Intercompany transaction created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create intercompany transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="IC Transactions"
        description="Intercompany invoices and bills backed by the finance ledger."
        breadcrumbs={[
          { label: "Intercompany", href: "/intercompany/overview" },
          { label: "Transactions" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain IC invoice/bill and elimination journal." label="Explain IC transactions" />
            <Button variant="outline" size="sm" onClick={() => openCreate("IC_INVOICE")}>
              IC Invoice
            </Button>
            <Button variant="outline" size="sm" onClick={() => openCreate("IC_BILL")}>
              IC Bill
            </Button>
            <Button size="sm" onClick={() => router.push("/docs/journal/new")}>
              <Icons.FileEdit className="mr-2 h-4 w-4" />
              Generate elimination journal
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/intercompany/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by number, entity..."
          searchValue={search}
          onSearchChange={setSearch}
        />
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Create IC invoices and bills, then post elimination journals from finance.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<ICTransactionRow>
              data={filtered}
              columns={columns}
              emptyMessage="No IC transactions."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consolidation snapshot</CardTitle>
            <CardDescription>Live intercompany balances grouped by currency.</CardDescription>
          </CardHeader>
          <CardContent>
            {consolidation.length === 0 ? (
              <p className="text-sm text-muted-foreground">No consolidation balances yet.</p>
            ) : (
              <div className="space-y-2">
                {consolidation.map((row) => (
                  <div key={row.currency} className="flex items-center justify-between text-sm">
                    <span>{row.currency}</span>
                    <span className="font-medium">{formatMoney(row.amount, row.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <EntityDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={creatingType === "IC_INVOICE" ? "New IC invoice" : "New IC bill"}
        description="Create a live intercompany transaction."
        mode="create"
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pr-4">
          <div className="space-y-2">
            <Label>From entity</Label>
            <Select value={form.fromEntityId} onValueChange={(value) => setForm((current) => ({ ...current, fromEntityId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To entity</Label>
            <Select value={form.toEntityId} onValueChange={(value) => setForm((current) => ({ ...current, toEntityId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} />
          </div>
        </div>
      </EntityDrawer>
    </PageShell>
  );
}
