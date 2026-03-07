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
  fetchCommissionRuns,
  fetchCommissionRules,
  fetchTopUps,
  postCommissionRun,
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
          <Button onClick={() => toast.info("Create commission run: POST /api/franchise/commission/runs")}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New run
          </Button>
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
          </>
        )}
      </div>
    </PageShell>
  );
}
