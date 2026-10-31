"use client";

import * as React from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api/client";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

type Deduction = { _id: string; paymentId: string; billId: string; category: string; amount: number; status: string; dueDate: string; certificateNumber?: string };
type PaymentOption = { id: string; label: string; bills: Array<{ id: string; number: string }> };
type Bank = { id: string; name: string };

export function WithholdingIncomeTaxPanel() {
  const canApprove = useHasPermission("finance.approve");
  const [rows, setRows] = React.useState<Deduction[]>([]);
  const [options, setOptions] = React.useState<PaymentOption[]>([]);
  const [banks, setBanks] = React.useState<Bank[]>([]);
  const [paymentId, setPaymentId] = React.useState("");
  const [billId, setBillId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [residency, setResidency] = React.useState("RESIDENT");
  const [base, setBase] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [remit, setRemit] = React.useState<Deduction | null>(null);
  const [bank, setBank] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [certificate, setCertificate] = React.useState("");
  const [date, setDate] = React.useState("");
  const refresh = React.useCallback(async () => {
    try { setRows((await apiRequest<{ items: Deduction[] }>("/api/tax/withholding-deductions")).items); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load deductions."); }
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);
  const loadOptions = React.useCallback(async (search: string) => {
    const result = await apiRequest<{ items: PaymentOption[]; banks: Bank[] }>("/api/tax/withholding-payment-options", { params: new URLSearchParams({ search }) });
    setOptions((current) => [...new Map([...current, ...result.items].map((item) => [item.id, item])).values()]);
    setBanks(result.banks);
    return result.items;
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await apiRequest("/api/tax/withholding-deductions", { method: "POST", body: { paymentId, billId, category, residency, taxableValue: Number(base), rate: Number(rate) / 100 } });
      toast.success("Withholding recorded and applied to the supplier bill.");
      setPaymentId(""); setBillId(""); setBase(""); setRate(""); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Deduction could not be recorded."); }
    finally { setBusy(false); }
  }
  async function saveRemittance(event: React.FormEvent) {
    event.preventDefault(); if (!remit) return; setBusy(true);
    try {
      await apiRequest(`/api/tax/withholding-deductions/${encodeURIComponent(remit._id)}/remittance`, { method: "POST", body: { bankAccountId: bank, reference, certificate, date: `${date}T12:00:00+03:00` } });
      toast.success("Remittance recorded."); setRemit(null); setReference(""); setCertificate(""); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Remittance could not be recorded."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 space-y-4">
    <h2 className="text-lg font-semibold">Withholding income tax register</h2>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {canApprove && <form onSubmit={save} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <div className="space-y-2"><Label>Posted supplier payment</Label><AsyncSearchableSelect value={paymentId} loadOptions={loadOptions} onValueChange={(value) => { setPaymentId(value); setBillId(""); }} placeholder="Search payment number or reference" /></div>
      <div className="space-y-2"><Label htmlFor="wht-bill">Bill settled by payment</Label><select id="wht-bill" required value={billId} onChange={(e) => setBillId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Select bill</option>{options.find((o) => o.id === paymentId)?.bills.map((bill) => <option key={bill.id} value={bill.id}>{bill.number}</option>)}</select></div>
      <div><Label htmlFor="wht-category">Payment category</Label><Input id="wht-category" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. professional fees" /></div>
      <div><Label htmlFor="wht-residency">Supplier tax residency</Label><select id="wht-residency" value={residency} onChange={(e) => setResidency(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="RESIDENT">Resident</option><option value="NON_RESIDENT">Non-resident</option><option value="TREATY">Treaty treatment</option></select></div>
      <div><Label htmlFor="wht-base">Taxable value KES</Label><Input id="wht-base" type="number" required min="0.01" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} /></div>
      <div><Label htmlFor="wht-rate">Approved rate %</Label><Input id="wht-rate" type="number" required min="0.001" max="100" step="0.001" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
      <p className="text-sm text-muted-foreground">Deduction {formatMoney(Number(base) * Number(rate) / 100 || 0, "KES")}. Confirm category, residency and applicable rate against the supplier&apos;s tax treatment. This records a deduction already made from the payment.</p>
      <Button disabled={busy || !paymentId || !billId} type="submit">Record deduction</Button>
    </form>}
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Bill</th><th>Category</th><th>Deduction</th><th>Due</th><th>Status</th><th>Certificate</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row._id} className="border-b"><td className="p-2"><Link className="underline" href={`/docs/bill/${encodeURIComponent(row.billId)}`}>View supplier bill</Link></td><td>{row.category}</td><td>{formatMoney(row.amount, "KES")}</td><td>{new Date(row.dueDate).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}</td><td>{row.status}</td><td>{row.certificateNumber || "Pending"}</td><td>{canApprove && row.status === "DEDUCTED" && <Button variant="outline" size="sm" onClick={() => { setRemit(row); void loadOptions(""); }}>Record remittance</Button>}</td></tr>)}</tbody></table></div>
    {remit && <form onSubmit={saveRemittance} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"><p className="md:col-span-2">Record the completed payment to KRA of {formatMoney(remit.amount, "KES")}. Saving posts the bank and tax liability entries; it does not send a payment or file a return.</p>
      <div><Label htmlFor="wht-bank">Bank account</Label><select id="wht-bank" required value={bank} onChange={(e) => setBank(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Select bank</option>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div><Label htmlFor="wht-date">Remittance date</Label><Input id="wht-date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div><Label htmlFor="wht-reference">Payment reference</Label><Input id="wht-reference" required value={reference} onChange={(e) => setReference(e.target.value)} /></div>
      <div><Label htmlFor="wht-certificate">Certificate number</Label><Input id="wht-certificate" required value={certificate} onChange={(e) => setCertificate(e.target.value)} /></div>
      <Button type="submit" disabled={busy}>Record remittance</Button><Button type="button" variant="outline" onClick={() => setRemit(null)}>Cancel</Button>
    </form>}
  </section>;
}
