"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchRouteCollections, recordRouteCollection, type RouteCloseFigures, type RouteCollection } from "@/lib/api/route-settlement";
import { groupReceiptMoney, parseReceiptMoney } from "@/lib/ar/receipt-money";
import { formatMoney } from "@/lib/money";
import { useHasPermission } from "@/lib/rbac/use-write-guard";

export function RouteMpesaCollections({ routeId, canCapture, summary, onRecorded }: {
  routeId: string; canCapture: boolean; summary: NonNullable<RouteCloseFigures["collections"]>; onRecorded: () => void;
}) {
  const canWrite = useHasPermission("finance.write", "sales.write") && canCapture;
  const canReview = useHasPermission("finance.bank.read");
  const money = (amount: number) => formatMoney(amount, "KES");
  const [items, setItems] = React.useState<RouteCollection[]>();
  const [customer, setCustomer] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [reference, setReference] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [till, setTill] = React.useState("");
  const [invoice, setInvoice] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    let current = true;
    fetchRouteCollections(routeId).then(result => { if (current) setItems(result.items); })
      .catch(e => { if (current) setError((e as Error).message); });
    return () => { current = false; };
  }, [routeId, reload]);

  async function record(event: React.FormEvent) {
    event.preventDefault();
    if (!customer || !canWrite || busy) return;
    setBusy(true); setError("");
    try {
      await recordRouteCollection(routeId, { partyId: customer.id, reference, amount: parseReceiptMoney(amount), tillNumber: till, invoiceHint: invoice });
      setReference(""); setAmount(""); setInvoice(""); setReload(r => r + 1);
      onRecorded();
      toast.success("Collection captured. Finance can match it in AR Payments.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">Route M-Pesa collections</CardTitle>
      <CardDescription>Capture transactions collected on this route, including payments for previous invoices. Finance verifies them against the M-Pesa statement.</CardDescription></CardHeader>
    <CardContent className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span>Verified route collections: <strong>{money(summary.verifiedMpesa)}</strong></span>
        <span>Waiting for a match: <strong>{money(summary.pendingMpesa)}</strong> ({summary.pendingCount.toLocaleString("en-KE")})</span>
        <span>Counted in this handover: <strong>{money(summary.mpesaHandover)}</strong></span>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {canWrite && <Button variant="outline" size="sm" onClick={() => setShowForm(o => !o)} disabled={busy}>{showForm ? "Hide entry" : "Add M-Pesa collection"}</Button>}
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setReload(r => r + 1); onRecorded(); }}>Refresh</Button>
      </div>
      {showForm && canWrite && <form onSubmit={e => void record(e)} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
        <div className="space-y-1 text-sm"><p>Customer</p>
          <AsyncSearchableSelect value={customer?.id || ""} selectedOption={customer} onValueChange={() => {}}
            onOptionSelect={setCustomer} loadOptions={searchArCustomerOptionsApi} disabled={busy} placeholder="Select customer" searchPlaceholder="Search by name or code" />
        </div>
        <label className="space-y-1 text-sm"><span>M-Pesa transaction code</span><Input required maxLength={20} value={reference} disabled={busy} onChange={e => setReference(e.target.value.toUpperCase())} /></label>
        <label className="space-y-1 text-sm"><span>Amount (KES)</span><Input required inputMode="decimal" value={amount} disabled={busy} onChange={e => setAmount(e.target.value)} onBlur={() => setAmount(groupReceiptMoney(amount))} /></label>
        <label className="space-y-1 text-sm"><span>Receiving till (optional)</span><Input inputMode="numeric" maxLength={20} value={till} disabled={busy} onChange={e => setTill(e.target.value)} /></label>
        <label className="space-y-1 text-sm"><span>Invoice number (optional)</span><Input maxLength={120} value={invoice} disabled={busy} onChange={e => setInvoice(e.target.value)} /></label>
        <Button className="self-end justify-self-start" disabled={busy || !customer || !/^[A-Z0-9]{8,20}$/.test(reference.trim()) || !(parseReceiptMoney(amount) > 0)}>{busy ? "Saving…" : "Save collection"}</Button>
      </form>}
      {!items && !error && <p className="text-sm text-muted-foreground">Loading collections…</p>}
      {items?.length === 0 && <p className="text-sm text-muted-foreground">No M-Pesa transactions captured on this route yet.</p>}
      {items && items.length > 0 && <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
        {items.map(item => <li key={item._id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-sm">
          <div><p className="font-medium">{item.reference} · {item.partyName}</p>
            <p className="text-muted-foreground">{item.invoiceHint || "No invoice specified"}{item.tillNumber ? ` · Till ${item.tillNumber}` : ""}</p></div>
          <span className="tabular-nums">{money(item.amount)}</span>
          {(item.verified ?? Boolean(item.paymentId)) ? <span className="text-muted-foreground">Verified</span>
            : canReview ? <Button variant="link" size="sm" asChild><Link href={`/ar/payments?statementReference=${encodeURIComponent(item.reference)}`}>Review in AR Payments</Link></Button>
            : <span className="text-muted-foreground">Waiting for Finance</span>}
        </li>)}
      </ul>}
    </CardContent>
  </Card>;
}
