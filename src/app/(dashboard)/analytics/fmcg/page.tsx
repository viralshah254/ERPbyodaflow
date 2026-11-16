"use client";

import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchFmcgAnalyticsApi, type FmcgAnalytics } from "@/lib/api/fmcg-analytics";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { todayNairobiYmd } from "@/lib/format/nairobi-datetime";

const METHOD_LABEL: Record<string, string> = { CASH: "Cash", MPESA: "M-Pesa", BANK_TRANSFER: "Bank", CHEQUE: "Cheque" };

function monthStart(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

function Tile({ label, value, hint, href, warn }: { label: string; value: string; hint?: string; href?: string; warn?: boolean }) {
  const body = (
    <Card className={warn ? "border-amber-300" : undefined}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? "text-amber-700" : ""}`}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default function FmcgAnalyticsPage() {
  const currency = useBaseCurrency();
  const money = (n: number) => formatMoney(n, currency, { decimals: 0 });
  const today = todayNairobiYmd();
  const [from, setFrom] = React.useState(monthStart(today));
  const [to, setTo] = React.useState(today);
  const [data, setData] = React.useState<FmcgAnalytics | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const request = React.useRef(0);

  const load = React.useCallback(() => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    fetchFmcgAnalyticsApi(from, to)
      .then((next) => { if (id === request.current) setData(next); })
      .catch((e) => { if (id === request.current) { setData(null); setError(e instanceof Error ? e.message : "Could not load analytics."); } })
      .finally(() => { if (id === request.current) setLoading(false); });
  }, [from, to]);
  React.useEffect(load, [load]);

  return (
    <PageShell>
      <PageHeader
        title="FMCG performance"
        description="Sales after returns, who returns the most, money collected, route closes and production waste."
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "FMCG performance" }]}
        sticky
        actions={
          <div className="flex items-end gap-2">
            <div className="space-y-1"><Label htmlFor="from" className="text-xs">From</Label><Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label htmlFor="to" className="text-xs">To</Label><Input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          </div>
        }
      />
      <div className="space-y-4 p-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!data ? (
          !error ? <p className="text-sm text-muted-foreground">Loading…</p> : null
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Net sales" value={money(data.sales.net)} hint={`${money(data.sales.invoiced)} invoiced, ${money(data.sales.credited)} credited`} />
              <Tile label="Returns" value={`${data.sales.returnsPercent}%`} hint="Credit notes as a share of invoiced sales" warn={data.sales.returnsPercent > 5} />
              <Tile label="Collected" value={money(data.money.collected)} hint={Object.entries(data.money.byMethod).map(([m, v]) => `${METHOD_LABEL[m] ?? m} ${money(v)}`).join(" · ") || "No receipts"} />
              <Tile label="Overdue" value={money(data.money.overdue)} hint={`${money(data.money.owed)} owed in total`} href="/docs/invoice" warn={data.money.overdue > 0} />
              <Tile
                label="Route runs closed"
                value={`${data.routeClose.closed} of ${data.routeClose.runs}`}
                hint={`${data.routeClose.variancePending} waiting for variance approval, ${data.routeClose.notClosed} not closed`}
                href="/warehouse/route-settlement"
                warn={data.routeClose.variancePending + data.routeClose.notClosed > 0}
              />
              <Tile label="Production waste" value={`${data.production.wastePercent}%`} hint={`${data.production.waste} wasted of ${data.production.produced + data.production.waste} made`} warn={data.production.wastePercent > 3} />
              <Tile label="Write-offs waiting" value={String(data.pendingWriteOffs)} hint="Loss cases waiting for approval" href="/inventory/quality?kind=LOSS" warn={data.pendingWriteOffs > 0} />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sales and returns by day</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.sales.byDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No posted invoices in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.sales.byDay} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={48} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Legend />
                      <Bar dataKey="net" name="Net sales" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="credited" name="Returns credited" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top customers</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Net sales</TableHead><TableHead className="text-right">Returns</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.customers.top.map((c) => (
                        <TableRow key={c.partyId}><TableCell>{c.name}</TableCell><TableCell className="text-right tabular-nums">{money(c.net)}</TableCell><TableCell className="text-right tabular-nums">{c.returnsPercent}%</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Customers returning the most</CardTitle>
                  <CardDescription>Compare with the allowance in Settings → Sales → Returns policy.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Returned</TableHead><TableHead className="text-right">Of sales</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.customers.highestReturns.map((c) => (
                        <TableRow key={c.partyId}><TableCell>{c.name}</TableCell><TableCell className="text-right tabular-nums">{money(c.returns)}</TableCell><TableCell className="text-right tabular-nums">{c.returnsPercent}%</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top products</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Sold</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="text-right">Returned</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {data.products.top.map((p) => (
                        <TableRow key={p.productId}><TableCell>{p.name}</TableCell><TableCell className="text-right tabular-nums">{p.soldQty}</TableCell><TableCell className="text-right tabular-nums">{money(p.soldValue)}</TableCell><TableCell className="text-right tabular-nums">{p.returnsPercent}%</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Why production was wasted</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {data.production.reasons.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No waste recorded on work orders in this period.</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Reason</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.production.reasons.map((r) => (
                          <TableRow key={r.reason}><TableCell>{r.reason}</TableCell><TableCell className="text-right tabular-nums">{r.qty}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
