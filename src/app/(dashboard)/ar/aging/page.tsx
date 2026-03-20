"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import Link from "next/link";

type AgingRow = {
  partyId: string;
  partyName: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
};

type AgingData = {
  items: AgingRow[];
  totals: Omit<AgingRow, "partyId" | "partyName">;
};

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
  const [data, setData] = React.useState<AgingData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    if (!isApiConfigured()) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/ar/aging");
      if (!resp.ok) throw new Error("Failed to load aging data");
      const json = await resp.json() as AgingData;
      setData(json);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

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
    <PageShell>
      <PageHeader
        title="AR Aging Report"
        description="Outstanding invoice balances by days overdue"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
              <Icons.Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={load} disabled={loading}>
              <Icons.RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Summary KPI row */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { label: "Current", value: data.totals.current, bucket: "current" as const },
            { label: "1–30 days", value: data.totals.days_1_30, bucket: "1_30" as const },
            { label: "31–60 days", value: data.totals.days_31_60, bucket: "31_60" as const },
            { label: "61–90 days", value: data.totals.days_61_90, bucket: "61_90" as const },
            { label: ">90 days", value: data.totals.over_90, bucket: "90plus" as const },
          ].map((kpi) => (
            <Card key={kpi.label} className={kpi.value > 0 ? heatColor(kpi.value, kpi.bucket).replace("text-", "border-").replace("bg-", "").split(" ")[0] : ""}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-lg font-semibold ${kpi.value > 0 ? heatColor(kpi.value, kpi.bucket).split(" ")[0] : "text-muted-foreground"}`}>
                  {fmt(kpi.value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Aging Schedule</CardTitle>
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8 text-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : !data || filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {!isApiConfigured() ? "API not configured" : "No outstanding invoices"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-right px-3 py-2 font-medium text-emerald-700">Current</th>
                    <th className="text-right px-3 py-2 font-medium text-amber-600">1–30 days</th>
                    <th className="text-right px-3 py-2 font-medium text-orange-600">31–60 days</th>
                    <th className="text-right px-3 py-2 font-medium text-red-600">61–90 days</th>
                    <th className="text-right px-3 py-2 font-medium text-red-800">&gt;90 days</th>
                    <th className="text-right px-4 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.partyId} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2">
                        <Link href={`/master/parties?search=${encodeURIComponent(row.partyName)}`} className="text-primary hover:underline">
                          {row.partyName}
                        </Link>
                      </td>
                      <td className={`text-right px-3 py-2 ${heatColor(row.current, "current")}`}>
                        {row.current > 0 ? fmt(row.current) : "—"}
                      </td>
                      <td className={`text-right px-3 py-2 rounded ${heatColor(row.days_1_30, "1_30")}`}>
                        {row.days_1_30 > 0 ? fmt(row.days_1_30) : "—"}
                      </td>
                      <td className={`text-right px-3 py-2 rounded ${heatColor(row.days_31_60, "31_60")}`}>
                        {row.days_31_60 > 0 ? fmt(row.days_31_60) : "—"}
                      </td>
                      <td className={`text-right px-3 py-2 rounded ${heatColor(row.days_61_90, "61_90")}`}>
                        {row.days_61_90 > 0 ? fmt(row.days_61_90) : "—"}
                      </td>
                      <td className={`text-right px-3 py-2 rounded ${heatColor(row.over_90, "90plus")}`}>
                        {row.over_90 > 0 ? fmt(row.over_90) : "—"}
                      </td>
                      <td className="text-right px-4 py-2 font-medium">{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="text-right px-3 py-2 text-emerald-700">{fmt(data.totals.current)}</td>
                    <td className="text-right px-3 py-2 text-amber-600">{fmt(data.totals.days_1_30)}</td>
                    <td className="text-right px-3 py-2 text-orange-600">{fmt(data.totals.days_31_60)}</td>
                    <td className="text-right px-3 py-2 text-red-600">{fmt(data.totals.days_61_90)}</td>
                    <td className="text-right px-3 py-2 text-red-800">{fmt(data.totals.over_90)}</td>
                    <td className="text-right px-4 py-2">{fmt(data.totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
