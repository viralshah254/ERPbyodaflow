"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  fetchFranchiseesApi,
  fetchRoyaltyChargesApi,
  runRoyaltiesMonthApi,
  patchFranchiseeApi,
  type FranchiseeRow,
  type RoyaltyChargeRow,
} from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";

export default function FranchiseRoyaltiesPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canWrite = permissions.includes("franchise.commission.write");
  const [franchisees, setFranchisees] = React.useState<FranchiseeRow[]>([]);
  const [charges, setCharges] = React.useState<RoyaltyChargeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [editId, setEditId] = React.useState<string>("");
  const [editAmount, setEditAmount] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([fetchFranchiseesApi(), fetchRoyaltyChargesApi()])
      .then(([fi, ch]) => {
        setFranchisees(fi.filter((x) => x.isActive !== false));
        setCharges(ch);
      })
      .catch((e) => toast.error((e as Error)?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveFranchiseRoyalty = async () => {
    if (!editId) {
      toast.error("Select an outlet/franchisee.");
      return;
    }
    const n = Number(editAmount.replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a non-negative amount.");
      return;
    }
    try {
      await patchFranchiseeApi(editId, { monthlyRoyaltyKes: n });
      toast.success("Royalty saved.");
      setEditAmount("");
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Save failed");
    }
  };

  const handleRunPriorMonth = async () => {
    setRunning(true);
    try {
      const out = await runRoyaltiesMonthApi();
      toast.success(`Invoicing run finished for ${out.year}-${String(out.month).padStart(2, "0")}.`);
      load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const feById = React.useMemo(
    () => new Map(franchisees.map((f) => [f.id, `${f.code} · ${f.name}`])),
    [franchisees]
  );

  const royaltyColumns = [
    {
      id: "period",
      header: "Period",
      accessor: (r: RoyaltyChargeRow) => `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`,
    },
    {
      id: "fe",
      header: "Outlet",
      accessor: (r: RoyaltyChargeRow) => feById.get(r.franchiseeId) ?? r.franchiseeId.slice(0, 8),
    },
    {
      id: "amt",
      header: "Royalty",
      accessor: (r: RoyaltyChargeRow) => formatMoney(r.amountKes, "KES"),
    },
    {
      id: "inv",
      header: "Invoiced",
      accessor: (r: RoyaltyChargeRow) => (r.invoiceDocumentId ? "Yes" : "No"),
    },
    {
      id: "sett",
      header: "Settled from commission",
      accessor: (r: RoyaltyChargeRow) => formatMoney(r.settledKes ?? 0, "KES"),
    },
    { id: "st", header: "Status", accessor: (r: RoyaltyChargeRow) => r.status },
  ];

  const feColumns = [
    {
      id: "name",
      header: "Franchisee",
      accessor: (r: FranchiseeRow) => `${r.code} · ${r.name}`,
    },
    {
      id: "mr",
      header: "Royalty/month (KES)",
      accessor: (r: FranchiseeRow) =>
        r.monthlyRoyaltyKes == null ? "Default (see org franchise settings)" : String(r.monthlyRoyaltyKes),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Royalty billing"
        description="Monthly franchise royalty invoicing (typically KSH 15,000) and netting against commission runs."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/commission" }, { label: "Royalty billing" }]}
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual month-end invoicing</CardTitle>
            <CardDescription>
              Creates royalty charges and POSTED invoices for each active franchise for the chosen calendar month. Defaults to the&nbsp;
              <strong>prior calendar month</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" disabled={running || !canWrite} onClick={handleRunPriorMonth}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate prior month royalties
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outlet royalty amount</CardTitle>
            <CardDescription>Override KES per outlet; leave empty in API to inherit org default (15,000).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Franchisee</Label>
              <Select value={editId || ""} onValueChange={setEditId}>
                <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>
                  {franchisees.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.code} · {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly royalty (KES)</Label>
              <Input
                className="w-40"
                inputMode="numeric"
                placeholder="15000"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <Button type="button" disabled={!canWrite} variant="secondary" onClick={saveFranchiseRoyalty}>
              Save outlet override
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charges</CardTitle>
            <CardDescription>Historical royalty assessments and withholding progress.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
            ) : (
              <DataTable data={charges} columns={royaltyColumns} emptyMessage="No royalty charges yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Franchisee registry (royalty overrides)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? null : (
              <DataTable data={franchisees} columns={feColumns} emptyMessage="No franchisees." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
