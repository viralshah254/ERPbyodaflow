"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { MassBalanceChart } from "@/components/operational/MassBalanceChart";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import {
  fetchCashWeightAuditLines,
  fetchCashWeightAuditSummary,
  fetchFranchiseeStock,
  fetchSubcontractOrders,
  fetchTopUps,
  fetchVMIReplenishmentOrders,
} from "@/lib/api/cool-catch";
import { PERISHABLE_DISTRIBUTION_TEMPLATE_IDS } from "@/config/industryTemplates/templates";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useUIStore } from "@/stores/ui-store";
import * as Icons from "lucide-react";

type ExceptionRow = {
  id: string;
  type: string;
  reference: string;
  status: string;
  value: string;
};

function GenericControlTower() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generic Control Tower</CardTitle>
        <CardDescription>Template-specific command center appears when industry features are enabled.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" onClick={() => setCommandPaletteOpen(true)}>
          <Icons.Command className="mr-2 h-4 w-4" />
          Open command bar
        </Button>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ControlTowerPage() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const templateId = useOrgContextStore((s) => s.templateId);
  const featureFlags = useOrgContextStore((s) => s.featureFlags);
  const perishableControlTowerEnabled =
    PERISHABLE_DISTRIBUTION_TEMPLATE_IDS.includes(
      (templateId ?? "") as (typeof PERISHABLE_DISTRIBUTION_TEMPLATE_IDS)[number]
    ) ||
    (featureFlags.procurementAuditCashWeight === true &&
      featureFlags.vmiReplenishment === true &&
      featureFlags.commissionEngine === true);

  const [loading, setLoading] = React.useState(true);
  const [kpis, setKpis] = React.useState({
    purchasedWeight: 0,
    receivedWeight: 0,
    inProcessing: 0,
    franchiseLowStockSkus: 0,
    replenishmentOrdersOpen: 0,
    topUpExposure: 0,
    procurementMatched: 0,
    procurementVariance: 0,
    procurementPending: 0,
  });
  const [exceptions, setExceptions] = React.useState<ExceptionRow[]>([]);
  const [yieldSnapshot, setYieldSnapshot] = React.useState({
    inputKg: 0,
    primaryKg: 0,
    secondaryKg: 0,
    lossKg: 0,
    serviceFeeTotal: 0,
  });

  React.useEffect(() => {
    if (!perishableControlTowerEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchCashWeightAuditLines(),
      fetchCashWeightAuditSummary(),
      fetchSubcontractOrders(),
      fetchFranchiseeStock(),
      fetchVMIReplenishmentOrders(),
      fetchTopUps(),
    ])
      .then(([auditLines, auditSummary, subOrders, stockRows, replenishments, topUps]) => {
        if (cancelled) return;
        const purchasedWeight = auditLines.reduce((acc, l) => acc + (l.paidWeightKg ?? 0), 0);
        const receivedWeight = auditLines.reduce((acc, l) => acc + (l.receivedWeightKg ?? 0), 0);
        const inProcessing = subOrders.filter((o) => o.status === "SENT").length;
        const franchiseLowStockSkus = stockRows.filter((s) => s.qty <= s.reorderPoint).length;
        const replenishmentOrdersOpen = replenishments.filter((r) => r.status !== "RECEIVED").length;
        const topUpExposure = topUps.reduce((acc, t) => acc + t.amount, 0);

        const totalInput = subOrders.reduce((acc, o) => {
          const input = (o.lines ?? []).filter((l) => l.type === "INPUT").reduce((a, l) => a + l.quantity, 0);
          return acc + input;
        }, 0);
        const totalPrimary = subOrders.reduce((acc, o) => {
          const out = (o.lines ?? []).filter((l) => l.type === "OUTPUT_PRIMARY").reduce((a, l) => a + l.quantity, 0);
          return acc + out;
        }, 0);
        const totalSecondary = subOrders.reduce((acc, o) => {
          const out = (o.lines ?? []).filter((l) => l.type === "OUTPUT_SECONDARY").reduce((a, l) => a + l.quantity, 0);
          return acc + out;
        }, 0);
        const totalLoss = Math.max(0, totalInput - (totalPrimary + totalSecondary));
        const feeTotal = subOrders.reduce((acc, o) => {
          const fees = (o.lines ?? []).reduce((a, l) => a + (l.processingFeePerUnit ?? 0) * l.quantity, 0);
          return acc + fees;
        }, 0);

        const summary = auditSummary?.summary;
        setKpis({
          purchasedWeight,
          receivedWeight,
          inProcessing,
          franchiseLowStockSkus,
          replenishmentOrdersOpen,
          topUpExposure,
          procurementMatched: summary?.matchedCount ?? 0,
          procurementVariance: summary?.varianceCount ?? 0,
          procurementPending: summary?.pendingCount ?? 0,
        });
        setYieldSnapshot({
          inputKg: totalInput,
          primaryKg: totalPrimary,
          secondaryKg: totalSecondary,
          lossKg: totalLoss,
          serviceFeeTotal: feeTotal,
        });

        const exceptionRows: ExceptionRow[] = auditLines
          .filter((l) => l.status === "VARIANCE")
          .slice(0, 8)
          .map((l) => ({
            id: l.id,
            type: "Weight Variance",
            reference: `${l.poNumber} · ${l.sku}`,
            status: l.status,
            value: `${(l.varianceKg ?? 0).toFixed(1)} kg`,
          }));
        for (const s of stockRows.filter((r) => r.qty <= r.reorderPoint).slice(0, 8 - exceptionRows.length)) {
          exceptionRows.push({
            id: `stock-${s.franchiseeId}-${s.sku}`,
            type: "Low Franchise Stock",
            reference: `${s.franchiseeName} · ${s.sku}`,
            status: "LOW_STOCK",
            value: `${s.qty} / RP ${s.reorderPoint}`,
          });
        }
        setExceptions(exceptionRows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [perishableControlTowerEnabled]);

  const exceptionColumns = [
    { id: "type", header: "Exception", accessor: (r: ExceptionRow) => r.type, sticky: true },
    { id: "reference", header: "Reference", accessor: (r: ExceptionRow) => r.reference },
    {
      id: "status",
      header: "Status",
      accessor: (r: ExceptionRow) => (
        <Badge variant={r.status.includes("VARIANCE") ? "destructive" : "secondary"}>{r.status}</Badge>
      ),
    },
    { id: "value", header: "Value", accessor: (r: ExceptionRow) => r.value },
  ];

  const poWeight = kpis.purchasedWeight;
  const paidWeight = kpis.purchasedWeight;
  const receivedWeight = kpis.receivedWeight;

  return (
    <PageShell>
      <PageHeader
        title={perishableControlTowerEnabled ? "Perishable Command Center" : "Control Tower"}
        description={
          perishableControlTowerEnabled
            ? "Real-time sourcing, processing, cold chain, franchise, and finance visibility."
            : "Supply chain command layer for template-enabled modules."
        }
        breadcrumbs={[{ label: "Control Tower" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)}>
            <Icons.MessageSquare className="mr-2 h-4 w-4" />
            Ask AI (⌘K)
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        {!perishableControlTowerEnabled ? (
          <GenericControlTower />
        ) : loading ? (
          <div className="text-sm text-muted-foreground">Loading command center data…</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <OperationalKpiCard
                title="Weight Purchased"
                value={kpis.purchasedWeight.toLocaleString()}
                unit="kg"
                subtitle="Farm-gate disbursement basis"
                href="/purchasing/cash-weight-audit"
              />
              <OperationalKpiCard
                title="Weight Received"
                value={kpis.receivedWeight.toLocaleString()}
                unit="kg"
                subtitle="Facility confirmed receipt"
                trend={{ value: `${(kpis.receivedWeight - kpis.purchasedWeight).toFixed(1)} kg`, direction: kpis.receivedWeight >= kpis.purchasedWeight ? "up" : "down" }}
                severity={kpis.receivedWeight >= kpis.purchasedWeight ? "success" : "warning"}
                href="/inventory/receiving"
              />
              <OperationalKpiCard
                title="Batches In Processing"
                value={kpis.inProcessing}
                subtitle="Subcontracted work centers"
                href="/manufacturing/subcontracting"
              />
              <OperationalKpiCard
                title="Franchise Low-Stock SKUs"
                value={kpis.franchiseLowStockSkus}
                subtitle="At or below reorder point"
                severity={kpis.franchiseLowStockSkus > 0 ? "warning" : "success"}
                href="/franchise/vmi"
              />
              <OperationalKpiCard
                title="Open Replenishments"
                value={kpis.replenishmentOrdersOpen}
                subtitle="Not yet received"
                href="/distribution/transfer-planning"
              />
              <OperationalKpiCard
                title="Top-up Exposure"
                value={kpis.topUpExposure.toLocaleString()}
                unit="KES"
                subtitle="Current support obligations"
                severity={kpis.topUpExposure > 0 ? "danger" : "success"}
                href="/finance/commission-topup"
              />
              <OperationalKpiCard
                title="Procurement Recon"
                value={`${kpis.procurementMatched} matched`}
                subtitle={`${kpis.procurementVariance} variance · ${kpis.procurementPending} pending`}
                severity={kpis.procurementVariance > 0 ? "warning" : "success"}
                href="/purchasing/cash-weight-audit"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <ProcurementVariancePanel
                poWeightKg={poWeight}
                paidWeightKg={paidWeight}
                receivedWeightKg={receivedWeight}
              />
              <YieldBreakdownCard
                inputKg={yieldSnapshot.inputKg}
                primaryKg={yieldSnapshot.primaryKg}
                secondaryKg={yieldSnapshot.secondaryKg}
                lossKg={yieldSnapshot.lossKg}
                serviceFeeTotal={yieldSnapshot.serviceFeeTotal}
              />
            </div>

            <MassBalanceChart
              inputKg={yieldSnapshot.inputKg}
              outputKg={yieldSnapshot.primaryKg}
              byproductKg={yieldSnapshot.secondaryKg}
              wasteKg={yieldSnapshot.lossKg}
            />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Exception Center</CardTitle>
                  <CardDescription>Weight mismatches and low-stock franchise alerts that need action now.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/purchasing/cash-weight-audit">Review Variance</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/franchise/vmi">Open Replenishment</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable<ExceptionRow> data={exceptions} columns={exceptionColumns} emptyMessage="No active exceptions." />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
