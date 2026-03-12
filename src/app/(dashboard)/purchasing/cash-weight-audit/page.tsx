"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ExceptionBanner } from "@/components/operational/ExceptionBanner";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { LiveCurrencyConverterCard } from "@/components/operational/LiveCurrencyConverterCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchCashWeightAuditLines,
  fetchCashDisbursements,
  createCashDisbursement,
  reconcileCashWeightAudit,
  buildCashWeightAudit,
} from "@/lib/api/cool-catch";
import type { CashWeightAuditLineRow, CashDisbursementRow } from "@/lib/mock/purchasing/cash-weight-audit";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CashWeightAuditPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [view, setView] = React.useState<"audit" | "disbursements">("audit");
  const [auditLines, setAuditLines] = React.useState<CashWeightAuditLineRow[]>([]);
  const [disbursements, setDisbursements] = React.useState<CashDisbursementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);
  const [disbursementOpen, setDisbursementOpen] = React.useState(false);
  const [disbPoId, setDisbPoId] = React.useState("");
  const [disbAmount, setDisbAmount] = React.useState("");
  const [disbCurrency, setDisbCurrency] = React.useState("KES");
  const [disbPaidAt, setDisbPaidAt] = React.useState("");
  const [disbReference, setDisbReference] = React.useState("");
  const [disbPaidWeightKg, setDisbPaidWeightKg] = React.useState("");
  const [savingDisb, setSavingDisb] = React.useState(false);
  const [buildingAudit, setBuildingAudit] = React.useState(false);
  const [buildDateFrom, setBuildDateFrom] = React.useState("");
  const [buildDateTo, setBuildDateTo] = React.useState("");
  const [buildSheetOpen, setBuildSheetOpen] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchCashWeightAuditLines(statusFilter ? { status: statusFilter } : undefined).then(setAuditLines),
      fetchCashDisbursements().then(setDisbursements),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load data");
      });
  }, [statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleReconcile = async (line: CashWeightAuditLineRow) => {
    if (line.status === "MATCHED") return;
    setReconcilingId(line.id);
    try {
      await reconcileCashWeightAudit({
        auditLineId: line.id,
        paidWeightKg: line.paidWeightKg ?? undefined,
        receivedWeightKg: line.receivedWeightKg ?? undefined,
      });
      toast.success("Reconciled.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Reconcile failed");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleRecordDisbursement = async () => {
    if (!disbPoId.trim() || !disbAmount || !disbPaidAt) {
      toast.error("PO, amount and paid date are required.");
      return;
    }
    const amount = parseFloat(disbAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSavingDisb(true);
    try {
      await createCashDisbursement({
        poId: disbPoId.trim(),
        amount,
        currency: disbCurrency,
        paidAt: disbPaidAt,
        reference: disbReference.trim() || undefined,
        paidWeightKg: disbPaidWeightKg ? parseFloat(disbPaidWeightKg) : undefined,
      });
      toast.success("Disbursement recorded.");
      setDisbursementOpen(false);
      setDisbPoId("");
      setDisbAmount("");
      setDisbPaidAt("");
      setDisbReference("");
      setDisbPaidWeightKg("");
      await load();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Record failed";
      toast.error(msg === "STUB" ? "Configure API to record disbursements." : msg);
    } finally {
      setSavingDisb(false);
    }
  };

  const handleBuildAudit = async () => {
    setBuildingAudit(true);
    try {
      const res = await buildCashWeightAudit(
        buildDateFrom || buildDateTo ? { dateFrom: buildDateFrom || undefined, dateTo: buildDateTo || undefined } : undefined
      );
      toast.success(`Built ${res.built} audit line(s).`);
      setBuildSheetOpen(false);
      setBuildDateFrom("");
      setBuildDateTo("");
      await load();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Build failed";
      toast.error(msg === "STUB" ? "Configure API to build audit lines." : msg);
    } finally {
      setBuildingAudit(false);
    }
  };

  const auditColumns = [
    { id: "po", header: "PO", accessor: (r: CashWeightAuditLineRow) => <span className="font-medium">{r.poNumber}</span>, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: CashWeightAuditLineRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: CashWeightAuditLineRow) => r.productName },
    { id: "ordered", header: "Ordered qty", accessor: (r: CashWeightAuditLineRow) => r.orderedQty },
    { id: "paidKg", header: "Paid weight (kg)", accessor: (r: CashWeightAuditLineRow) => r.paidWeightKg ?? "—" },
    { id: "receivedKg", header: "Received weight (kg)", accessor: (r: CashWeightAuditLineRow) => r.receivedWeightKg ?? "—" },
    { id: "variance", header: "Variance (kg)", accessor: (r: CashWeightAuditLineRow) => (r.varianceKg != null ? (r.varianceKg >= 0 ? `+${r.varianceKg}` : r.varianceKg) : "—") },
    { id: "status", header: "Status", accessor: (r: CashWeightAuditLineRow) => (
      <Badge variant={r.status === "MATCHED" ? "default" : r.status === "VARIANCE" ? "destructive" : "secondary"}>{r.status}</Badge>
    ) },
    { id: "actions", header: "", accessor: (r: CashWeightAuditLineRow) =>
      r.status !== "MATCHED" ? (
        <Button size="sm" variant="ghost" disabled={reconcilingId === r.id} onClick={() => handleReconcile(r)}>
          {reconcilingId === r.id ? "Reconciling…" : "Reconcile"}
        </Button>
      ) : null,
    },
  ];

  const disbursementColumns = [
    { id: "reference", header: "Reference", accessor: (r: CashDisbursementRow) => <span className="font-medium">{r.reference}</span>, sticky: true },
    { id: "po", header: "PO", accessor: (r: CashDisbursementRow) => r.poNumber },
    { id: "amount", header: "Amount", accessor: (r: CashDisbursementRow) => formatMoney(r.amount, r.currency) },
    { id: "paidAt", header: "Paid at", accessor: (r: CashDisbursementRow) => r.paidAt },
    { id: "status", header: "Status", accessor: (r: CashDisbursementRow) => <Badge variant={r.status === "RECONCILED" ? "default" : "secondary"}>{r.status}</Badge> },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Cash-to-Weight Audit"
        description="Reconcile PO → Cash disbursement → Actual weight received (CoD integrity)"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Cash-to-Weight Audit" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Sheet open={disbursementOpen} onOpenChange={setDisbursementOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Record disbursement
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Record cash disbursement</SheetTitle>
                  <SheetDescription>Farm-gate CoD payment linked to a PO; include paid weight for audit.</SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label htmlFor="disbPoId">PO ID</Label>
                    <Input id="disbPoId" value={disbPoId} onChange={(e) => setDisbPoId(e.target.value)} placeholder="e.g. po1" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="disbAmount">Amount</Label>
                    <Input id="disbAmount" type="number" step="0.01" value={disbAmount} onChange={(e) => setDisbAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="disbCurrency">Currency</Label>
                    <Select value={disbCurrency} onValueChange={setDisbCurrency}>
                      <SelectTrigger id="disbCurrency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES">KES</SelectItem>
                        <SelectItem value="UGX">UGX</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="disbPaidAt">Paid at (date)</Label>
                    <Input id="disbPaidAt" type="date" value={disbPaidAt} onChange={(e) => setDisbPaidAt(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="disbReference">Reference (optional)</Label>
                    <Input id="disbReference" value={disbReference} onChange={(e) => setDisbReference(e.target.value)} placeholder="Reference" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="disbPaidWeightKg">Paid weight (kg, optional)</Label>
                    <Input id="disbPaidWeightKg" type="number" step="0.01" value={disbPaidWeightKg} onChange={(e) => setDisbPaidWeightKg(e.target.value)} placeholder="—" />
                  </div>
                  <Button onClick={handleRecordDisbursement} disabled={savingDisb}>
                    {savingDisb ? "Saving…" : "Save disbursement"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Sheet open={buildSheetOpen} onOpenChange={setBuildSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Build audit
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Build audit lines</SheetTitle>
                  <SheetDescription>Create audit lines from PO + Cash disbursements + GRN (optional date range).</SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label htmlFor="buildDateFrom">Date from (optional)</Label>
                    <Input id="buildDateFrom" type="date" value={buildDateFrom} onChange={(e) => setBuildDateFrom(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buildDateTo">Date to (optional)</Label>
                    <Input id="buildDateTo" type="date" value={buildDateTo} onChange={(e) => setBuildDateTo(e.target.value)} />
                  </div>
                  <Button onClick={handleBuildAudit} disabled={buildingAudit}>
                    {buildingAudit ? "Building…" : "Build"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/three-way-match">Standard 3-way match (PO / GRN / Bill)</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <ExceptionBanner
          type="warning"
          title="Cash-heavy procurement needs same-day reconciliation"
          description="Use this workspace to compare PO quantity, cash disbursement weight, and actual received weight before losses or grading differences are approved."
          actions={[
            { label: "Record disbursement", onClick: () => setDisbursementOpen(true) },
            { label: "Build audit", onClick: () => setBuildSheetOpen(true), variant: "outline" },
          ]}
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <ProcurementVariancePanel
            poWeightKg={auditLines.reduce((a, r) => a + r.orderedQty, 0)}
            paidWeightKg={auditLines.reduce((a, r) => a + (r.paidWeightKg ?? 0), 0)}
            receivedWeightKg={auditLines.reduce((a, r) => a + (r.receivedWeightKg ?? 0), 0)}
          />
          <LiveCurrencyConverterCard />
        </div>
        <div className="flex gap-2 border-b">
          <Button variant={view === "audit" ? "secondary" : "ghost"} size="sm" onClick={() => setView("audit")}>
            Audit lines
          </Button>
          <Button variant={view === "disbursements" ? "secondary" : "ghost"} size="sm" onClick={() => setView("disbursements")}>
            Cash disbursements
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {view === "audit" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Procurement audit trail</CardTitle>
                    <CardDescription>Match PO line → Cash disbursement → GRN received weight; flag variances (transit shrinkage, grading).</CardDescription>
                  </div>
                  <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="MATCHED">Matched</SelectItem>
                      <SelectItem value="VARIANCE">Variance</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={auditLines} columns={auditColumns} emptyMessage="No audit lines." />
                </CardContent>
              </Card>
            )}

            {view === "disbursements" && (
              <Card>
                <CardHeader>
                  <CardTitle>Cash disbursements</CardTitle>
                  <CardDescription>Farm-gate CoD payments linked to POs; reconcile to GRN weight.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={disbursements} columns={disbursementColumns} emptyMessage="No disbursements." />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
