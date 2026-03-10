"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
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
  fetchCommissionRuns,
  fetchCommissionRules,
  fetchTopUps,
  postCommissionRun,
  calculateCommissionRun,
  createCommissionRun,
  fetchCommissionSummary,
  type CommissionSummaryRow,
} from "@/lib/api/cool-catch";
import type { CommissionRunRow, CommissionRuleRow, TopUpRow } from "@/lib/mock/franchise/commission";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FranchiseCommissionPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [runs, setRuns] = React.useState<CommissionRunRow[]>([]);
  const [rules, setRules] = React.useState<CommissionRuleRow[]>([]);
  const [topUps, setTopUps] = React.useState<TopUpRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [postingId, setPostingId] = React.useState<string | null>(null);
  const [newRunOpen, setNewRunOpen] = React.useState(false);
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [summaryFrom, setSummaryFrom] = React.useState("");
  const [summaryTo, setSummaryTo] = React.useState("");
  const [summaryStatus, setSummaryStatus] = React.useState<"ALL" | "DRAFT" | "POSTED">("ALL");
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [summaryRows, setSummaryRows] = React.useState<CommissionSummaryRow[]>([]);
  const [summaryTotals, setSummaryTotals] = React.useState<{ totalCommission: number; totalTopUp: number; totalPayout: number } | null>(null);

  const loadRuns = React.useCallback(() => {
    return fetchCommissionRuns(statusFilter ? { status: statusFilter } : undefined).then(setRuns);
  }, [statusFilter]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadRuns(),
      fetchCommissionRules().then((r) => { if (!cancelled) setRules(r); }),
      fetchTopUps().then((r) => { if (!cancelled) setTopUps(r); }),
    ])
      .then(() => { if (!cancelled) setLoading(false); })
      .catch((e) => {
        if (!cancelled) {
          setLoading(false);
          toast.error(e?.message ?? "Failed to load data");
        }
      });
    return () => { cancelled = true; };
  }, [loadRuns]);

  const loadSummary = React.useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetchCommissionSummary({
        dateFrom: summaryFrom || undefined,
        dateTo: summaryTo || undefined,
        status: summaryStatus,
      });
      setSummaryRows(res.items ?? []);
      setSummaryTotals({
        totalCommission: res.totalCommission,
        totalTopUp: res.totalTopUp,
        totalPayout: res.totalPayout,
      });
    } catch (e) {
      const msg = (e as Error)?.message ?? "Failed to load summary";
      toast.error(msg === "STUB" ? "Configure API to load commission summary." : msg);
      setSummaryRows([]);
      setSummaryTotals(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryFrom, summaryTo, summaryStatus]);

  React.useEffect(() => {
    // Default summary to current month when first loading
    if (!summaryFrom && !summaryTo) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setSummaryFrom(start.toISOString().slice(0, 10));
      setSummaryTo(now.toISOString().slice(0, 10));
    }
  }, [summaryFrom, summaryTo]);

  const handlePostRun = async (r: CommissionRunRow) => {
    if (r.status !== "DRAFT") return;
    setPostingId(r.id);
    try {
      await postCommissionRun(r.id);
      toast.success("Run posted.");
      await loadRuns();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Post failed");
    } finally {
      setPostingId(null);
    }
  };

  const handleCalculateRun = async () => {
    if (!periodStart || !periodEnd) {
      toast.error("Enter period start and end.");
      return;
    }
    setCreating(true);
    try {
      await calculateCommissionRun({ periodStart, periodEnd });
      toast.success("Commission run calculated.");
      setNewRunOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      await loadRuns();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Calculate failed";
      toast.error(msg === "STUB" ? "Configure API to calculate runs." : msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDraftRun = async () => {
    if (!periodStart || !periodEnd) {
      toast.error("Enter period start and end.");
      return;
    }
    setCreating(true);
    try {
      await createCommissionRun({ periodStart, periodEnd });
      toast.success("Draft run created.");
      setNewRunOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      await loadRuns();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Create failed";
      toast.error(msg === "STUB" ? "Configure API to create runs." : msg);
    } finally {
      setCreating(false);
    }
  };

  const runColumns = [
    { id: "number", header: "Run", accessor: (r: CommissionRunRow) => <span className="font-medium">{r.number}</span>, sticky: true },
    { id: "period", header: "Period", accessor: (r: CommissionRunRow) => `${r.periodStart} – ${r.periodEnd}` },
    { id: "status", header: "Status", accessor: (r: CommissionRunRow) => <Badge variant={r.status === "POSTED" ? "default" : "secondary"}>{r.status}</Badge> },
    { id: "totalPayout", header: "Total payout", accessor: (r: CommissionRunRow) => formatMoney(r.totalPayout, "KES") },
    { id: "lineCount", header: "Franchisees", accessor: (r: CommissionRunRow) => r.lineCount },
    { id: "actions", header: "", accessor: (r: CommissionRunRow) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" asChild><Link href={`/franchise/commission/runs/${r.id}`}>View</Link></Button>
        {r.status === "DRAFT" && (
          <Button size="sm" variant="outline" disabled={postingId === r.id} onClick={() => handlePostRun(r)}>
            {postingId === r.id ? "Posting…" : "Post"}
          </Button>
        )}
      </div>
    ) },
  ];

  const ruleColumns = [
    { id: "name", header: "Rule", accessor: (r: CommissionRuleRow) => <span className="font-medium">{r.name}</span>, sticky: true },
    { id: "type", header: "Type", accessor: (r: CommissionRuleRow) => r.type === "PERCENT_SALES" ? "% of sales" : "Fixed per unit" },
    { id: "rate", header: "Rate", accessor: (r: CommissionRuleRow) => r.type === "PERCENT_SALES" ? `${r.rate}%` : `${formatMoney(r.rate, "KES")}/unit` },
    { id: "period", header: "Period", accessor: (r: CommissionRuleRow) => r.periodType },
    { id: "active", header: "Active", accessor: (r: CommissionRuleRow) => r.isActive ? "Yes" : "No" },
  ];

  const topUpColumns = [
    { id: "franchisee", header: "Franchisee", accessor: (r: TopUpRow) => r.franchiseeName, sticky: true },
    { id: "run", header: "Run", accessor: (r: TopUpRow) => r.runNumber },
    { id: "amount", header: "Amount", accessor: (r: TopUpRow) => formatMoney(r.amount, "KES") },
    { id: "reason", header: "Reason", accessor: (r: TopUpRow) => r.reason },
    { id: "status", header: "Status", accessor: (r: TopUpRow) => <Badge variant={r.status === "POSTED" ? "default" : "secondary"}>{r.status}</Badge> },
  ];

  const summaryColumns = [
    { id: "franchisee", header: "Franchisee", accessor: (r: CommissionSummaryRow) => r.franchiseeName || r.franchiseeCode, sticky: true },
    { id: "runs", header: "Runs", accessor: (r: CommissionSummaryRow) => r.runs },
    { id: "sales", header: "Sales", accessor: (r: CommissionSummaryRow) => formatMoney(r.salesAmount, "KES") },
    { id: "commission", header: "Commission", accessor: (r: CommissionSummaryRow) => formatMoney(r.commissionAmount, "KES") },
    { id: "topup", header: "Top-up", accessor: (r: CommissionSummaryRow) => formatMoney(r.topUpAmount, "KES") },
    { id: "payout", header: "Total payout", accessor: (r: CommissionSummaryRow) => formatMoney(r.totalPayout, "KES") },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Commission & Rebates"
        description="Weekly commission runs, rules, and margin guarantee top-ups"
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/commission" },
          { label: "Commission & Rebates" },
        ]}
        sticky
        showCommandHint
        actions={
          <Sheet open={newRunOpen} onOpenChange={setNewRunOpen}>
            <SheetTrigger asChild>
              <Button>
                <Icons.Plus className="mr-2 h-4 w-4" />
                New run
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>New commission run</SheetTitle>
                <SheetDescription>
                  Calculate from posted invoices or create a draft run for the period.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="periodStart">Period start</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="periodEnd">Period end</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCalculateRun} disabled={creating}>
                    {creating ? "Calculating…" : "Calculate from invoices"}
                  </Button>
                  <Button variant="outline" onClick={handleCreateDraftRun} disabled={creating}>
                    Create draft
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        }
      />
      <div className="p-6 space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Commission runs</CardTitle>
                  <CardDescription>Weekly (or period) runs; post to create payout journal.</CardDescription>
                </div>
                <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="POSTED">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable data={runs} columns={runColumns} emptyMessage="No commission runs." />
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commission rules</CardTitle>
                  <CardDescription>Percent of sales or fixed per unit; weekly/monthly.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={rules} columns={ruleColumns} emptyMessage="No rules." />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top-ups (margin guarantee)</CardTitle>
                  <CardDescription>When commission is below floor (e.g. launch phase).</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={topUps} columns={topUpColumns} emptyMessage="No top-ups." />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Commission summary (Cool Catch)</CardTitle>
                  <CardDescription>Per-franchisee sales, commission, top-ups and total payout over a period.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="grid gap-1">
                    <Label htmlFor="summaryFrom">From</Label>
                    <Input
                      id="summaryFrom"
                      type="date"
                      value={summaryFrom}
                      onChange={(e) => setSummaryFrom(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="summaryTo">To</Label>
                    <Input
                      id="summaryTo"
                      type="date"
                      value={summaryTo}
                      onChange={(e) => setSummaryTo(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="summaryStatus">Status</Label>
                    <Select
                      value={summaryStatus}
                      onValueChange={(v) => setSummaryStatus(v as "ALL" | "DRAFT" | "POSTED")}
                    >
                      <SelectTrigger id="summaryStatus" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="POSTED">Posted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={loadSummary} disabled={summaryLoading}>
                    {summaryLoading ? "Loading…" : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {summaryRows.length === 0 && !summaryLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No summary rows. Adjust dates and refresh once backend is configured.
                  </p>
                ) : (
                  <DataTable<CommissionSummaryRow>
                    data={summaryRows}
                    columns={summaryColumns}
                    emptyMessage="No summary rows."
                  />
                )}
                {summaryTotals && (
                  <div className="border-t px-4 py-3 text-sm flex flex-wrap gap-4 justify-end text-muted-foreground">
                    <span>
                      Total commission:{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(summaryTotals.totalCommission, "KES")}
                      </span>
                    </span>
                    <span>
                      Total top-up:{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(summaryTotals.totalTopUp, "KES")}
                      </span>
                    </span>
                    <span>
                      Total payout:{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(summaryTotals.totalPayout, "KES")}
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}
