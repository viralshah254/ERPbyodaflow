"use client";

import * as React from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  approveRouteCloseApi,
  fetchRouteCloseApi,
  fetchRoutesToCloseApi,
  submitRouteCloseApi,
  type RouteCloseFigures,
  type RouteCloseListRow,
} from "@/lib/api/route-settlement";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { formatNairobiDate } from "@/lib/format/nairobi-datetime";

const STATUS_LABEL: Record<RouteCloseListRow["closeStatus"], string> = {
  OPEN: "To close",
  VARIANCE_PENDING: "Variance waiting for approval",
  CLOSED: "Closed",
};

function Equation({ title, ok, children }: { title: string; ok: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {ok ? <Icons.CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Icons.AlertTriangle className="h-4 w-4 text-amber-600" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export default function RouteClosePage() {
  const currency = useBaseCurrency();
  const money = React.useCallback((value: number) => formatMoney(value, currency), [currency]);
  const [rows, setRows] = React.useState<RouteCloseListRow[]>([]);
  const [listError, setListError] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [figures, setFigures] = React.useState<RouteCloseFigures | null>(null);
  const [figuresError, setFiguresError] = React.useState("");
  const [cash, setCash] = React.useState("");
  const [mpesa, setMpesa] = React.useState("");
  const [driverName, setDriverName] = React.useState("");
  const [approvalNote, setApprovalNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const requestRef = React.useRef(0);

  const loadList = React.useCallback(() => {
    setListError("");
    fetchRoutesToCloseApi()
      .then(setRows)
      .catch((e) => setListError(e instanceof Error ? e.message : "Could not load route runs."));
  }, []);
  React.useEffect(loadList, [loadList]);

  const loadFigures = React.useCallback((id: string, handover?: { cash: number; mpesa: number }) => {
    const request = ++requestRef.current;
    setFiguresError("");
    fetchRouteCloseApi(id, handover)
      .then((next) => { if (request === requestRef.current) setFigures(next); })
      .catch((e) => {
        if (request !== requestRef.current) return;
        setFigures(null);
        setFiguresError(e instanceof Error ? e.message : "Could not work out the route close.");
      });
  }, []);

  function open(row: RouteCloseListRow) {
    setSelected(row.id);
    setFigures(null);
    setCash("");
    setMpesa("");
    setDriverName("");
    setApprovalNote("");
    loadFigures(row.id);
  }

  const cashValue = cash.trim() === "" ? NaN : Number(cash);
  const mpesaValue = mpesa.trim() === "" ? NaN : Number(mpesa);
  const handoverValid = Number.isFinite(cashValue) && cashValue >= 0 && Number.isFinite(mpesaValue) && mpesaValue >= 0;

  React.useEffect(() => {
    if (!selected || !handoverValid) return;
    const timer = window.setTimeout(() => loadFigures(selected, { cash: cashValue, mpesa: mpesaValue }), 350);
    return () => window.clearTimeout(timer);
  }, [selected, handoverValid, cashValue, mpesaValue, loadFigures]);

  const selectedRow = rows.find((row) => row.id === selected);

  async function submit() {
    if (!selected || !handoverValid || busy) return;
    setBusy(true);
    try {
      const result = await submitRouteCloseApi(selected, { declaredCash: cashValue, declaredMpesa: mpesaValue, driverName: driverName.trim() || undefined });
      setFigures(result.figures);
      if (result.close.status === "CLOSED") toast.success("Route closed. Everything balances.");
      else toast.warning("Close submitted with a variance. Someone else must approve it.");
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not close the route.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await approveRouteCloseApi(selected, approvalNote);
      toast.success("Variance approved. Route closed.");
      setSelected(null);
      setFigures(null);
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve the variance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Route close"
        description="Each route run closes on stock, sales and money worked out from posted documents. A variance needs someone other than the driver and the person who submitted it."
        breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Route close" }]}
        sticky
        actions={
          <Button variant="outline" size="sm" onClick={loadList}>
            <Icons.RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Route runs to close</CardTitle>
            <CardDescription>Invoiced loading notes that are not closed yet.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {listError ? (
              <p className="p-4 text-sm text-destructive">{listError}</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No route runs are waiting to close.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load</TableHead>
                    <TableHead>Route · truck</TableHead>
                    <TableHead>Left</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={`cursor-pointer ${row.id === selected ? "bg-muted" : ""}`}
                      onClick={() => open(row)}
                    >
                      <TableCell className="font-medium">{row.number}</TableCell>
                      <TableCell>{row.routeName} · {row.truck}</TableCell>
                      <TableCell>{row.departedAt ? formatNairobiDate(row.departedAt) : "Not yet"}</TableCell>
                      <TableCell>{STATUS_LABEL[row.closeStatus]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!selected ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Choose a route run to see its close.</CardContent>
            </Card>
          ) : figuresError ? (
            <Card>
              <CardContent className="p-6 text-sm text-destructive">{figuresError}</CardContent>
            </Card>
          ) : !figures ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Working out the close…</CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Equation title="Stock" ok={figures.stock.balanced && figures.returnsPosted.awaitingReturn === 0}>
                  <Row label="Delivery notes" value={String(figures.returnsPosted.deliveryNotes)} />
                  <Row label="Returns posted" value={String(figures.returnsPosted.withReturn)} />
                  <Row label="Products balanced" value={figures.stock.balanced ? "Yes" : "No"} strong />
                </Equation>
                <Equation title="Sales" ok={figures.sales.creditPendingApproval === 0}>
                  <Row label="Invoiced" value={money(figures.sales.invoiced)} />
                  <Row label="Returns credited" value={`− ${money(figures.sales.credited)}`} />
                  {figures.sales.creditPendingApproval ? <Row label="Credit notes in draft" value={money(figures.sales.creditPendingApproval)} /> : null}
                  <Row label="Net sales" value={money(figures.sales.netSales)} strong />
                </Equation>
                <Equation title="Money" ok={Math.abs(figures.money.unexplained) < 0.005}>
                  <Row label="Cash receipts" value={money(figures.money.cashReceipts)} />
                  <Row label="M-Pesa receipts" value={money(figures.money.mpesaReceipts)} />
                  {figures.money.otherReceipts ? <Row label="Other receipts" value={money(figures.money.otherReceipts)} /> : null}
                  <Row label="Still owed by customers" value={money(figures.money.stillOwed)} />
                  <Row label="Not accounted for" value={money(figures.money.unexplained)} strong />
                </Equation>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stock by product</CardTitle>
                  <CardDescription>Loaded = delivered + returned. Gap is loaded minus issued on delivery notes.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Loaded</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Returned good</TableHead>
                        <TableHead className="text-right">Returned damaged</TableHead>
                        <TableHead className="text-right">Gap</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {figures.stock.lines.map((line) => (
                        <TableRow key={line.productId}>
                          <TableCell>{line.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{line.loaded}</TableCell>
                          <TableCell className="text-right tabular-nums">{line.delivered}</TableCell>
                          <TableCell className="text-right tabular-nums">{line.returnedGood}</TableCell>
                          <TableCell className="text-right tabular-nums">{line.returnedDamaged}</TableCell>
                          <TableCell className={`text-right tabular-nums ${Math.abs(line.gap) >= 0.0005 ? "font-semibold text-amber-700" : ""}`}>{line.gap}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {selectedRow?.closeStatus === "VARIANCE_PENDING" ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Approve the variance</CardTitle>
                    <CardDescription>You cannot approve a close you submitted or a route you drove.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {figures.issues.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                        {figures.issues.map((issue) => <li key={issue}>{issue}</li>)}
                      </ul>
                    ) : null}
                    <div className="space-y-1">
                      <Label htmlFor="approvalNote">Why is the variance accepted?</Label>
                      <Input id="approvalNote" value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} />
                    </div>
                    <Button disabled={busy || !approvalNote.trim()} onClick={approve}>Approve and close</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Driver hand-over</CardTitle>
                    <CardDescription>Enter what the driver handed in. It is compared with the cash and M-Pesa receipts recorded for this route.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor="driverName">Driver</Label>
                        <Input id="driverName" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Name" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cash">Cash handed in</Label>
                        <Input id="cash" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mpesa">M-Pesa handed in</Label>
                        <Input id="mpesa" inputMode="decimal" value={mpesa} onChange={(e) => setMpesa(e.target.value)} />
                      </div>
                    </div>
                    {figures.handover ? (
                      <div className="grid gap-1 text-sm sm:grid-cols-2">
                        <Row label="Cash difference" value={money(figures.handover.cashGap)} strong />
                        <Row label="M-Pesa difference" value={money(figures.handover.mpesaGap)} strong />
                      </div>
                    ) : null}
                    {figures.issues.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                        {figures.issues.map((issue) => <li key={issue}>{issue}</li>)}
                      </ul>
                    ) : handoverValid ? (
                      <p className="text-sm text-emerald-700">Everything balances. The route will close at once.</p>
                    ) : null}
                    <Button disabled={busy || !handoverValid || figures.returnsPosted.awaitingReturn > 0} onClick={submit}>
                      {figures.issues.length ? "Submit with variance" : "Close route"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
