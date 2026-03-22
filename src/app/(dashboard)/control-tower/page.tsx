"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { MassBalanceChart } from "@/components/operational/MassBalanceChart";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import {
  ThreeWayMatchComparisonTable,
  type ThreeWayMatchRow,
} from "@/components/operational/ThreeWayMatchComparisonTable";
import { FranchiseHealthCard } from "@/components/operational/FranchiseHealthCard";
import { CommissionSummaryCard } from "@/components/operational/CommissionSummaryCard";
import {
  fetchCashWeightAuditLines,
  fetchCashWeightAuditSummary,
  fetchFranchiseeStock,
  fetchSubcontractOrders,
  fetchTopUps,
  fetchVMIReplenishmentOrders,
  fetchWIPBalances,
  fetchFranchiseNetworkSummary,
  fetchCommissionSummary,
  fetchCommissionRuns,
  autoReplenish,
  buildCashWeightAudit,
  assignCashWeightException,
  approveCashWeightException,
  type FranchiseNetworkSummary,
  type CommissionSummaryRow,
} from "@/lib/api/cool-catch";
import type { CashWeightAuditLineRow } from "@/lib/mock/purchasing/cash-weight-audit";
import type { WIPBalanceRow, SubcontractOrderRow } from "@/lib/mock/manufacturing/subcontracting";
import type { CommissionRunRow, TopUpRow } from "@/lib/mock/franchise/commission";
import type { FranchiseeStockRow, VMIReplenishmentOrderRow } from "@/lib/mock/franchise/vmi";
import { PERISHABLE_DISTRIBUTION_TEMPLATE_IDS } from "@/config/industryTemplates/templates";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

// ——— Exception row type ———

type ExceptionRow = {
  id: string;
  exceptionType: "weight_variance" | "low_stock";
  reference: string;
  status: string;
  value: string;
  franchiseeId?: string;
  exceptionStatus?: string | null;
  slaOverdue?: boolean;
};

// ——— Helpers ———

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function GenericControlTower() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generic Control Tower</CardTitle>
        <CardDescription>
          Template-specific command center appears when industry features are enabled.
        </CardDescription>
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

// ——— Main page ———

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

  // ——— Date range ———
  const [dateFrom, setDateFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = React.useState(
    () => new Date().toISOString().slice(0, 10)
  );

  // ——— Refresh control ———
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // ——— Raw data state ———
  const [loading, setLoading] = React.useState(true);
  const [auditLines, setAuditLines] = React.useState<CashWeightAuditLineRow[]>([]);
  const [auditSummary, setAuditSummary] = React.useState<{
    summary: {
      totalLines: number;
      matchedCount: number;
      varianceCount: number;
      pendingCount: number;
      absoluteVarianceKg: number;
      netVarianceKg: number;
    };
  } | null>(null);
  const [subOrders, setSubOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [wipBalances, setWipBalances] = React.useState<WIPBalanceRow[]>([]);
  const [franchiseeStock, setFranchiseeStock] = React.useState<FranchiseeStockRow[]>([]);
  const [replenishments, setReplenishments] = React.useState<VMIReplenishmentOrderRow[]>([]);
  const [topUps, setTopUps] = React.useState<TopUpRow[]>([]);
  const [networkSummary, setNetworkSummary] = React.useState<FranchiseNetworkSummary | null>(null);
  const [commissionSummary, setCommissionSummary] = React.useState<{
    items: CommissionSummaryRow[];
    totalCommission: number;
    totalTopUp: number;
    totalPayout: number;
  } | null>(null);
  const [commissionRuns, setCommissionRuns] = React.useState<CommissionRunRow[]>([]);

  // ——— Fetch all data ———
  React.useEffect(() => {
    if (!perishableControlTowerEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchCashWeightAuditLines({ dateFrom, dateTo }),
      fetchCashWeightAuditSummary(),
      fetchSubcontractOrders(),
      fetchWIPBalances(),
      fetchFranchiseeStock(),
      fetchVMIReplenishmentOrders(),
      fetchTopUps(),
      fetchFranchiseNetworkSummary(),
      fetchCommissionSummary({ dateFrom, dateTo }),
      fetchCommissionRuns(),
    ])
      .then(([lines, summary, orders, wip, stock, repls, tops, network, commSummary, commRuns]) => {
        if (cancelled) return;
        setAuditLines(lines);
        setAuditSummary(summary);
        setSubOrders(orders);
        setWipBalances(wip);
        setFranchiseeStock(stock);
        setReplenishments(repls);
        setTopUps(tops);
        setNetworkSummary(network);
        setCommissionSummary(commSummary);
        setCommissionRuns(commRuns);
        setLastRefreshed(new Date());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [perishableControlTowerEnabled, dateFrom, dateTo, refreshKey]);

  // ——— Derived KPIs ———
  const poWeightKg = auditLines.reduce((acc, l) => acc + (l.orderedQty ?? 0), 0);
  const paidWeightKg = auditLines.reduce((acc, l) => acc + (l.paidWeightKg ?? 0), 0);
  const receivedWeightKg = auditLines.reduce((acc, l) => acc + (l.receivedWeightKg ?? 0), 0);

  const inProcessing = subOrders.filter(
    (o) => o.status === "SENT" || (o.status as string) === "WIP"
  ).length;
  const franchiseLowStockSkus = franchiseeStock.filter((s) => s.qty <= s.reorderPoint).length;
  const replenishmentOrdersOpen = replenishments.filter((r) => r.status !== "RECEIVED").length;
  const topUpExposure =
    networkSummary?.topUpExposure ?? topUps.reduce((acc, t) => acc + t.amount, 0);
  const networkSales = networkSummary?.networkSales ?? 0;

  const totalInputKg = subOrders.reduce((acc, o) => {
    return acc + (o.lines ?? []).filter((l) => l.type === "INPUT").reduce((a, l) => a + l.quantity, 0);
  }, 0);
  const totalPrimaryKg = subOrders.reduce((acc, o) => {
    return acc + (o.lines ?? []).filter((l) => l.type === "OUTPUT_PRIMARY").reduce((a, l) => a + l.quantity, 0);
  }, 0);
  const totalSecondaryKg = subOrders.reduce((acc, o) => {
    return acc + (o.lines ?? []).filter((l) => l.type === "OUTPUT_SECONDARY").reduce((a, l) => a + l.quantity, 0);
  }, 0);
  const totalLossKg = Math.max(0, totalInputKg - (totalPrimaryKg + totalSecondaryKg));
  const serviceFeeTotal = subOrders.reduce((acc, o) => {
    return acc + (o.lines ?? []).reduce((a, l) => a + (l.processingFeePerUnit ?? 0) * l.quantity, 0);
  }, 0);

  const totalNetworkSalesFromSummary = commissionSummary?.items.reduce(
    (acc, i) => acc + i.salesAmount,
    0
  ) ?? 0;

  const auditSummaryData = auditSummary?.summary;

  // ——— Exception rows (all types) ———
  const exceptions: ExceptionRow[] = React.useMemo(() => {
    const rows: ExceptionRow[] = auditLines
      .filter((l) => l.status === "VARIANCE")
      .map((l) => ({
        id: l.id,
        exceptionType: "weight_variance" as const,
        reference: `${l.poNumber} · ${l.sku}`,
        status: l.exceptionStatus ?? l.status,
        value: `${(l.varianceKg ?? 0).toFixed(1)} kg`,
        exceptionStatus: l.exceptionStatus,
        slaOverdue: l.slaOverdue,
      }));
    for (const s of franchiseeStock.filter((r) => r.qty <= r.reorderPoint)) {
      rows.push({
        id: `stock-${s.franchiseeId}-${s.sku}`,
        exceptionType: "low_stock",
        reference: `${s.franchiseeName} · ${s.sku}`,
        status: "LOW_STOCK",
        value: `${s.qty} / RP ${s.reorderPoint}`,
        franchiseeId: s.franchiseeId,
      });
    }
    return rows;
  }, [auditLines, franchiseeStock]);

  // ——— Three-way match rows ———
  const threeWayRows: ThreeWayMatchRow[] = React.useMemo(
    () =>
      auditLines.map((l) => ({
        id: l.id,
        reference: l.poNumber,
        sku: l.sku,
        poKg: l.orderedQty,
        paidKg: l.paidWeightKg,
        receivedKg: l.receivedWeightKg,
        varianceKg: l.varianceKg,
        status: l.status,
      })),
    [auditLines]
  );

  // ——— Quick actions ———
  async function handleAutoReplenish() {
    setActionLoading("replenish");
    try {
      await autoReplenish();
      setRefreshKey((k) => k + 1);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBuildAudit() {
    setActionLoading("audit");
    try {
      await buildCashWeightAudit({ dateFrom, dateTo });
      setRefreshKey((k) => k + 1);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAssignException(id: string) {
    setActionLoading(`assign-${id}`);
    try {
      await assignCashWeightException(id);
      setRefreshKey((k) => k + 1);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApproveException(id: string) {
    setActionLoading(`approve-${id}`);
    try {
      await approveCashWeightException(id);
      setRefreshKey((k) => k + 1);
    } finally {
      setActionLoading(null);
    }
  }

  // ——— Exception table columns ———
  const exceptionColumns = [
    {
      id: "exceptionType",
      header: "Type",
      sticky: true,
      accessor: (r: ExceptionRow) => (
        <div className="flex items-center gap-1.5">
          {r.exceptionType === "weight_variance" ? (
            <Icons.Scale className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          ) : (
            <Icons.PackageX className="h-3.5 w-3.5 shrink-0 text-rose-500" />
          )}
          <span className="text-xs">
            {r.exceptionType === "weight_variance" ? "Weight Variance" : "Low Stock"}
          </span>
        </div>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      accessor: (r: ExceptionRow) => (
        <span className="text-xs font-medium">{r.reference}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: ExceptionRow) => (
        <div className="flex items-center gap-1.5">
          <Badge
            variant={
              r.status === "OPEN" || r.status === "LOW_STOCK"
                ? "destructive"
                : r.status === "INVESTIGATING"
                ? "secondary"
                : "outline"
            }
          >
            {r.status}
          </Badge>
          {r.slaOverdue ? (
            <Badge variant="destructive" className="text-[10px]">
              SLA
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "value",
      header: "Value",
      accessor: (r: ExceptionRow) => (
        <span className="tabular-nums text-xs">{r.value}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: ExceptionRow) =>
        r.exceptionType === "weight_variance" ? (
          <div className="flex gap-1">
            {!r.exceptionStatus || r.exceptionStatus === "OPEN" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                disabled={actionLoading === `assign-${r.id}`}
                onClick={() => handleAssignException(r.id)}
              >
                Assign
              </Button>
            ) : null}
            {r.exceptionStatus === "INVESTIGATING" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                disabled={actionLoading === `approve-${r.id}`}
                onClick={() => handleApproveException(r.id)}
              >
                Approve
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" asChild>
              <Link href="/purchasing/cash-weight-audit">Review</Link>
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" asChild>
            <Link href="/franchise/vmi">Replenish</Link>
          </Button>
        ),
    },
  ];

  // ——— WIP table columns ———
  const wipColumns = [
    {
      id: "workCenter",
      header: "Work Center",
      sticky: true,
      accessor: (r: WIPBalanceRow) => (
        <span className="font-medium">{r.workCenterName}</span>
      ),
    },
    { id: "sku", header: "SKU", accessor: (r: WIPBalanceRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: WIPBalanceRow) => r.productName },
    {
      id: "qty",
      header: "Quantity",
      accessor: (r: WIPBalanceRow) => (
        <span className="tabular-nums font-semibold">
          {r.quantity.toLocaleString()} {r.uom}
        </span>
      ),
    },
    {
      id: "lastMovement",
      header: "Last Movement",
      accessor: (r: WIPBalanceRow) => new Date(r.lastMovementAt).toLocaleDateString(),
    },
  ];

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
          <div className="flex items-center gap-2">
            {lastRefreshed ? (
              <span className="hidden text-xs text-muted-foreground lg:block">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <Icons.RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)}>
              <Icons.MessageSquare className="mr-2 h-4 w-4" />
              Ask AI (⌘K)
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6">
        {!perishableControlTowerEnabled ? (
          <GenericControlTower />
        ) : (
          <>
            {/* Date range + quick actions bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-36 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-36 text-sm"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading === "audit"}
                  onClick={handleBuildAudit}
                >
                  <Icons.ClipboardCheck className="mr-2 h-3.5 w-3.5" />
                  Build Audit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading === "replenish"}
                  onClick={handleAutoReplenish}
                >
                  <Icons.Truck className="mr-2 h-3.5 w-3.5" />
                  Auto-Replenish
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Icons.RefreshCw className="h-4 w-4 animate-spin" />
                Loading command center data…
              </div>
            ) : (
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="procurement">Procurement</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="network">Network & Finance</TabsTrigger>
                </TabsList>

                {/* ═══ OVERVIEW TAB ═══ */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <OperationalKpiCard
                      title="PO Weight"
                      value={poWeightKg.toLocaleString()}
                      unit="kg"
                      subtitle="Total ordered quantity"
                      href="/purchasing/orders"
                    />
                    <OperationalKpiCard
                      title="Paid Weight"
                      value={paidWeightKg.toLocaleString()}
                      unit="kg"
                      subtitle="Farm-gate disbursement basis"
                      severity={paidWeightKg > poWeightKg ? "warning" : "default"}
                      href="/purchasing/cash-weight-audit"
                    />
                    <OperationalKpiCard
                      title="Received Weight"
                      value={receivedWeightKg.toLocaleString()}
                      unit="kg"
                      subtitle="Cold hub confirmed receipt"
                      trend={{
                        value: `${(receivedWeightKg - paidWeightKg).toFixed(1)} kg vs paid`,
                        direction: receivedWeightKg >= paidWeightKg ? "up" : "down",
                      }}
                      severity={receivedWeightKg >= paidWeightKg ? "success" : "warning"}
                      href="/inventory/receiving"
                    />
                    <OperationalKpiCard
                      title="Batches In Processing"
                      value={inProcessing}
                      subtitle="Active subcontract orders"
                      severity={inProcessing > 5 ? "warning" : "default"}
                      href="/manufacturing/subcontracting"
                    />
                    <OperationalKpiCard
                      title="Franchise Low-Stock SKUs"
                      value={franchiseLowStockSkus}
                      subtitle="At or below reorder point"
                      severity={franchiseLowStockSkus > 0 ? "warning" : "success"}
                      href="/franchise/vmi"
                    />
                    <OperationalKpiCard
                      title="Open Replenishments"
                      value={replenishmentOrdersOpen}
                      subtitle="Not yet received by outlets"
                      href="/distribution/transfer-planning"
                    />
                    <OperationalKpiCard
                      title="Network Sales"
                      value={formatMoney(networkSales, "KES")}
                      subtitle="Across all franchise outlets"
                      severity="success"
                      href="/franchise/network"
                    />
                    <OperationalKpiCard
                      title="Top-up Exposure"
                      value={formatMoney(topUpExposure, "KES")}
                      subtitle="Commission support obligations"
                      severity={topUpExposure > 0 ? "danger" : "success"}
                      href="/finance/commission-topup"
                    />
                  </div>

                  {auditSummaryData ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <OperationalKpiCard
                        title="Procurement Matched"
                        value={auditSummaryData.matchedCount}
                        subtitle="PO / Paid / Received aligned"
                        severity="success"
                        href="/purchasing/cash-weight-audit"
                      />
                      <OperationalKpiCard
                        title="Procurement Variance"
                        value={auditSummaryData.varianceCount}
                        subtitle={`${auditSummaryData.absoluteVarianceKg.toFixed(1)} kg absolute variance`}
                        severity={auditSummaryData.varianceCount > 0 ? "warning" : "success"}
                        href="/purchasing/cash-weight-audit"
                      />
                      <OperationalKpiCard
                        title="Pending Reconciliation"
                        value={auditSummaryData.pendingCount}
                        subtitle="Awaiting disbursement or GRN"
                        href="/purchasing/cash-weight-audit"
                      />
                    </div>
                  ) : null}

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Exception Center</CardTitle>
                        <CardDescription>
                          Weight mismatches and low-stock franchise alerts requiring action.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/purchasing/cash-weight-audit">All Variances</Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href="/franchise/vmi">VMI Dashboard</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <DataTable<ExceptionRow>
                        data={exceptions}
                        columns={exceptionColumns}
                        emptyMessage="No active exceptions."
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ═══ PROCUREMENT TAB ═══ */}
                <TabsContent value="procurement" className="mt-6 space-y-6">
                  <SectionHeader
                    title="Weight Reconciliation"
                    description="Compare PO ordered weight, cash-disbursement paid weight, and cold hub received weight."
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <OperationalKpiCard
                      title="PO Ordered Weight"
                      value={poWeightKg.toLocaleString()}
                      unit="kg"
                      subtitle="Total ordered across all POs"
                      href="/purchasing/orders"
                    />
                    <OperationalKpiCard
                      title="Paid Weight (Disbursed)"
                      value={paidWeightKg.toLocaleString()}
                      unit="kg"
                      subtitle="Actual farm-gate cash basis"
                      trend={{
                        value: `${paidWeightKg - poWeightKg > 0 ? "+" : ""}${(paidWeightKg - poWeightKg).toFixed(1)} kg vs PO`,
                        direction: paidWeightKg <= poWeightKg ? "up" : "down",
                      }}
                      severity={paidWeightKg > poWeightKg ? "warning" : "default"}
                      href="/purchasing/cash-weight-audit"
                    />
                    <OperationalKpiCard
                      title="Received Weight"
                      value={receivedWeightKg.toLocaleString()}
                      unit="kg"
                      subtitle="Cold hub gate-in confirmation"
                      trend={{
                        value: `${receivedWeightKg - paidWeightKg > 0 ? "+" : ""}${(receivedWeightKg - paidWeightKg).toFixed(1)} kg vs paid`,
                        direction: receivedWeightKg >= paidWeightKg ? "up" : "down",
                      }}
                      severity={receivedWeightKg >= paidWeightKg ? "success" : "warning"}
                      href="/inventory/receiving"
                    />
                  </div>

                  <ProcurementVariancePanel
                    poWeightKg={poWeightKg}
                    paidWeightKg={paidWeightKg}
                    receivedWeightKg={receivedWeightKg}
                  />

                  <ThreeWayMatchComparisonTable
                    rows={threeWayRows}
                    title="Cash-to-Weight Audit — Three-Way Match"
                    description="PO ordered weight vs. cash disbursement paid weight vs. physically received weight at cold hub."
                  />

                  {exceptions.filter((e) => e.exceptionType === "weight_variance").length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Open Weight Variances</CardTitle>
                        <CardDescription>
                          Lines with status VARIANCE requiring investigation or approval.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <DataTable<ExceptionRow>
                          data={exceptions.filter((e) => e.exceptionType === "weight_variance")}
                          columns={exceptionColumns}
                          emptyMessage="No weight variances."
                        />
                      </CardContent>
                    </Card>
                  ) : null}
                </TabsContent>

                {/* ═══ PROCESSING TAB ═══ */}
                <TabsContent value="processing" className="mt-6 space-y-6">
                  <SectionHeader
                    title="Processing & Yield"
                    description="External processor WIP, yield rates, and mass balance across active subcontract orders."
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <OperationalKpiCard
                      title="Batches In Processing"
                      value={inProcessing}
                      subtitle="At external work centers"
                      severity={inProcessing > 5 ? "warning" : "default"}
                      href="/manufacturing/subcontracting"
                    />
                    <OperationalKpiCard
                      title="Fish Sent to Processors"
                      value={totalInputKg.toLocaleString()}
                      unit="kg"
                      subtitle="Total input across all batches"
                    />
                    <OperationalKpiCard
                      title="Processing Service Fees"
                      value={formatMoney(serviceFeeTotal, "KES")}
                      subtitle="Accrued across active orders"
                      href="/manufacturing/subcontracting"
                    />
                  </div>

                  {wipBalances.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>WIP by Work Center</CardTitle>
                        <CardDescription>
                          Stock currently in the custody of each external processor.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <DataTable<WIPBalanceRow>
                          data={wipBalances}
                          columns={wipColumns}
                          emptyMessage="No WIP balances."
                        />
                      </CardContent>
                    </Card>
                  ) : null}

                  <div className="grid gap-6 xl:grid-cols-2">
                    <YieldBreakdownCard
                      inputKg={totalInputKg}
                      primaryKg={totalPrimaryKg}
                      secondaryKg={totalSecondaryKg}
                      lossKg={totalLossKg}
                      serviceFeeTotal={serviceFeeTotal}
                    />
                    <MassBalanceChart
                      inputKg={totalInputKg}
                      outputKg={totalPrimaryKg}
                      byproductKg={totalSecondaryKg}
                      wasteKg={totalLossKg}
                    />
                  </div>
                </TabsContent>

                {/* ═══ NETWORK & FINANCE TAB ═══ */}
                <TabsContent value="network" className="mt-6 space-y-6">
                  {networkSummary ? (
                    <>
                      <SectionHeader
                        title="Franchise Network"
                        description="Live outlet health snapshot across your distribution network."
                      />
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <OperationalKpiCard
                          title="Active Outlets"
                          value={`${networkSummary.activeOutletCount} / ${networkSummary.outletCount}`}
                          subtitle="Outlets in your network"
                          href="/franchise/network"
                        />
                        <OperationalKpiCard
                          title="Network Sales"
                          value={formatMoney(networkSummary.networkSales, "KES")}
                          subtitle="Total invoiced across network"
                          severity="success"
                          href="/franchise/network"
                        />
                        <OperationalKpiCard
                          title="AR Overdue"
                          value={formatMoney(networkSummary.arOverdue, "KES")}
                          subtitle="Outstanding receivables from outlets"
                          severity={networkSummary.arOverdue > 0 ? "danger" : "success"}
                          href="/finance"
                        />
                        <OperationalKpiCard
                          title="Stock Risk Outlets"
                          value={networkSummary.stockRiskOutlets}
                          subtitle="Below safety stock threshold"
                          severity={networkSummary.stockRiskOutlets > 0 ? "warning" : "success"}
                          href="/franchise/vmi"
                        />
                      </div>

                      {networkSummary.outlets && networkSummary.outlets.length > 0 ? (
                        <div className="space-y-4">
                          <SectionHeader
                            title="Outlet Health"
                            description="Per-outlet stock position, open replenishments, and AR exposure."
                          />
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {networkSummary.outlets.slice(0, 12).map((outlet) => {
                              const outletSkuCount = franchiseeStock.filter(
                                (s) => s.franchiseeId === outlet.id
                              ).length;
                              const outletOpenRepls = replenishments.filter(
                                (r) =>
                                  r.franchiseeId === outlet.id && r.status !== "RECEIVED"
                              ).length;
                              return (
                                <FranchiseHealthCard
                                  key={outlet.id}
                                  franchiseeId={outlet.id}
                                  franchiseeName={outlet.name}
                                  qtyOnHand={outlet.totalStockQty}
                                  skuCount={outletSkuCount || outlet.lowStockCount}
                                  topUpExposure={outlet.arOverdue}
                                  openReplenishments={outletOpenRepls}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <SectionHeader
                    title="Commission & Settlement"
                    description="Current period commission position and outstanding top-up obligations."
                  />

                  {commissionSummary ? (
                    <CommissionSummaryCard
                      title="Network Commission Summary"
                      salesAmount={totalNetworkSalesFromSummary}
                      commissionAmount={commissionSummary.totalCommission}
                      topUpAmount={commissionSummary.totalTopUp}
                      currency="KES"
                    />
                  ) : null}

                  {commissionRuns.filter((r) => r.status === "DRAFT").length > 0 ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Pending Commission Runs</CardTitle>
                          <CardDescription>
                            Draft runs awaiting review and posting to the general ledger.
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/franchise/commission">View All</Link>
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {commissionRuns
                          .filter((r) => r.status === "DRAFT")
                          .slice(0, 5)
                          .map((run) => (
                            <div
                              key={run.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                            >
                              <div>
                                <div className="font-medium">{run.number}</div>
                                <div className="text-xs text-muted-foreground">
                                  {run.periodStart} → {run.periodEnd}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{run.status}</Badge>
                                <Button size="sm" variant="outline" className="h-7" asChild>
                                  <Link href={`/franchise/commission/${run.id}`}>Review</Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  ) : null}

                  {exceptions.filter((e) => e.exceptionType === "low_stock").length > 0 ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Low-Stock Alerts</CardTitle>
                          <CardDescription>
                            Outlets below reorder point — replenishment recommended.
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          disabled={actionLoading === "replenish"}
                          onClick={handleAutoReplenish}
                        >
                          <Icons.Truck className="mr-2 h-3.5 w-3.5" />
                          Auto-Replenish All
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <DataTable<ExceptionRow>
                          data={exceptions.filter((e) => e.exceptionType === "low_stock")}
                          columns={exceptionColumns}
                          emptyMessage="All outlets stocked above reorder point."
                        />
                      </CardContent>
                    </Card>
                  ) : null}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
