"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
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
  reconcileCashWeightAudit,
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
            <Button variant="outline" size="sm" onClick={() => toast.info("Record disbursement: POST /api/purchasing/cash-weight-audit/disbursements")}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Record disbursement
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/three-way-match">Standard 3-way match (PO / GRN / Bill)</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
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
