"use client";

import * as React from "react";
import Link from "next/link";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiConfigured } from "@/lib/api/client";
import { fetchArAgingApi, type ArAgingData } from "@/lib/api/treasury-ops";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function heatColor(value: number, bucket: "current" | "1_30" | "31_60" | "61_90" | "90plus"): string {
  if (value <= 0) return "";
  if (bucket === "current") return "text-emerald-700 bg-emerald-50";
  if (bucket === "1_30") return "text-amber-600 bg-amber-50";
  if (bucket === "31_60") return "text-orange-600 bg-orange-50";
  if (bucket === "61_90") return "text-red-600 bg-red-50";
  return "text-red-800 bg-red-100 font-semibold";
}

export default function ArAgingPage() {
  const [data, setData] = React.useState<ArAgingData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    if (!isApiConfigured()) {
      setLoadError("API not configured.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const json = await fetchArAgingApi();
      setData(json);
    } catch (e) {
      const message = (e as Error).message || "Failed to load aging data";
      setLoadError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.items;
    return data.items.filter((r) => r.partyName.toLowerCase().includes(q) || r.partyId.toLowerCase().includes(q));
  }, [data, search]);

  const exportCsv = () => {
    if (!data) return;
    const headers = ["Customer", "Current", "1-30 days", "31-60 days", "61-90 days", ">90 days", "Total"];
    const rows = data.items.map((r) => [
      r.partyName,
      r.current.toFixed(2),
      r.days_1_30.toFixed(2),
      r.days_31_60.toFixed(2),
      r.days_61_90.toFixed(2),
      r.over_90.toFixed(2),
      r.total.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ar-aging-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="AR Aging Report"
        description="Outstanding invoice balances by days overdue"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
              <Icons.Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => void load()} disabled={loading}>
              <Icons.RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {data ? (
        <div className="grid shrink-0 grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-5 sm:px-6">
          {[
            { label: "Current", value: data.totals.current, bucket: "current" as const },
            { label: "1–30 days", value: data.totals.days_1_30, bucket: "1_30" as const },
            { label: "31–60 days", value: data.totals.days_31_60, bucket: "31_60" as const },
            { label: "61–90 days", value: data.totals.days_61_90, bucket: "61_90" as const },
            { label: ">90 days", value: data.totals.over_90, bucket: "90plus" as const },
          ].map((kpi) => (
            <Card key={kpi.label} className={kpi.value > 0 ? heatColor(kpi.value, kpi.bucket).replace("text-", "border-").replace("bg-", "").split(" ")[0] : ""}>
              <CardContent className="pb-3 pt-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-lg font-semibold ${kpi.value > 0 ? heatColor(kpi.value, kpi.bucket).split(" ")[0] : "text-muted-foreground"}`}>
                  {fmt(kpi.value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Aging Schedule</h3>
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 text-sm"
            />
          </div>
          {loadError ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : !data || filtered.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
              {!isApiConfigured() ? "API not configured" : "No outstanding invoices"}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-right font-medium text-emerald-700">Current</th>
                    <th className="px-3 py-2 text-right font-medium text-amber-600">1–30 days</th>
                    <th className="px-3 py-2 text-right font-medium text-orange-600">31–60 days</th>
                    <th className="px-3 py-2 text-right font-medium text-red-600">61–90 days</th>
                    <th className="px-3 py-2 text-right font-medium text-red-800">&gt;90 days</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.partyId} className="border-b transition-colors hover:bg-muted/20">
                      <td className="px-4 py-2">
                        <Link href={`/master/parties?search=${encodeURIComponent(row.partyName)}`} className="text-primary hover:underline">
                          {row.partyName}
                        </Link>
                      </td>
                      <td className={`px-3 py-2 text-right ${heatColor(row.current, "current")}`}>
                        {row.current > 0 ? fmt(row.current) : "—"}
                      </td>
                      <td className={`rounded px-3 py-2 text-right ${heatColor(row.days_1_30, "1_30")}`}>
                        {row.days_1_30 > 0 ? fmt(row.days_1_30) : "—"}
                      </td>
                      <td className={`rounded px-3 py-2 text-right ${heatColor(row.days_31_60, "31_60")}`}>
                        {row.days_31_60 > 0 ? fmt(row.days_31_60) : "—"}
                      </td>
                      <td className={`rounded px-3 py-2 text-right ${heatColor(row.days_61_90, "61_90")}`}>
                        {row.days_61_90 > 0 ? fmt(row.days_61_90) : "—"}
                      </td>
                      <td className={`rounded px-3 py-2 text-right ${heatColor(row.over_90, "90plus")}`}>
                        {row.over_90 > 0 ? fmt(row.over_90) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{fmt(data.totals.current)}</td>
                    <td className="px-3 py-2 text-right text-amber-600">{fmt(data.totals.days_1_30)}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{fmt(data.totals.days_31_60)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmt(data.totals.days_61_90)}</td>
                    <td className="px-3 py-2 text-right text-red-800">{fmt(data.totals.over_90)}</td>
                    <td className="px-4 py-2 text-right">{fmt(data.totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
