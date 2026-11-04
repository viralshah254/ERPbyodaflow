"use client";
import * as React from "react";
import { InventoryVatPreview, type InventoryVatPreviewData } from "@/components/finance/InventoryVatPreview";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { apiRequest } from "@/lib/api/client";
import { toast } from "sonner";
type Review = { _id: string; state: string; digest: string; proposedBy: string; reason: string; evidenceReference: string; payload: { recoverable: number; nonrecoverable: number; costPreview?: InventoryVatPreviewData; inventoryCostRestricted?: boolean } };
type Bill = { type?: string; date?: string; lines?: Array<{ lineId: string; label: string; tax: number; productId?: string }>; id: string; number: string; currency: string; tax: number; status: string; reviews: Review[]; inputVatChangeId?: string };
export default function InputVatPage() {
  const permissions = useAuthStore((s) => s.permissions), user = useAuthStore((s) => s.user?.userId), orgId = useAuthStore((s) => s.org?.orgId);
  const allowed = permissions.includes("finance.read") && permissions.includes("finance.tax.read");
  const [costAuthority, setCostAuthority] = React.useState(false);
  const [policy, setPolicy] = React.useState<{ confirmed: boolean; registration: string; recovery: string } | null>(null);
  const [search, setSearch] = React.useState(""), [rows, setRows] = React.useState<Bill[]>([]), [selected, setSelected] = React.useState<string>("");
  const [error, setError] = React.useState(""), [loading, setLoading] = React.useState(true), [busy, setBusy] = React.useState(false), [hasMore, setHasMore] = React.useState(false);
  const [allocation, setAllocation] = React.useState({ directTax: "", blockedTax: "0", commonTax: "0", taxableTurnover: "0", totalTurnover: "0" });
  const [dates, setDates] = React.useState({ accountingDate: "", costPostingDate: "" });
  const [lineRecovery, setLineRecovery] = React.useState<Record<string, string>>({});
  const [costCheck, setCostCheck] = React.useState<{ split?: { recoverable: number; nonrecoverable: number }; costPreview?: InventoryVatPreviewData } | null>(null);
  const costRequest = React.useRef(0);
  const [reason, setReason] = React.useState(""), [evidence, setEvidence] = React.useState("");
  const request = React.useRef(0), lock = React.useRef(false);
  const invalidate = React.useCallback(() => { request.current++; }, []);
  const load = React.useCallback(async () => {
    const generation = ++request.current; if (!allowed || !orgId) { setLoading(false); return; } setLoading(true); setError("");
    try { const data = await apiRequest<{ items: Bill[]; hasMore: boolean; canReviewInventoryCost?: boolean; policy: { confirmed: boolean; registration: string; recovery: string } }>("/api/finance/input-vat", { params: { search } }); if (generation !== request.current) return; setRows(data.items); setPolicy(data.policy); setCostAuthority(data.canReviewInventoryCost === true); setHasMore(data.hasMore); }
    catch (e) { if (generation === request.current) setError((e as Error).message); }
    finally { if (generation === request.current) setLoading(false); }
  }, [allowed, orgId, search]);
  React.useEffect(() => { setSelected(""); setRows([]); void load(); return invalidate; }, [load, invalidate]);
  const bill = rows.find((row) => row.id === selected);
  const costKey = JSON.stringify({ selected, allocation, lineRecovery, dates, evidence, orgId });
  React.useEffect(() => { costRequest.current++; setCostCheck(null); }, [costKey]);
  const allocationBody = () => ({ ...dates, ...Object.fromEntries(Object.entries(allocation).map(([key, value]) => [key, Number(value)])), ...(bill?.lines && bill.lines.length > 1 ? { lineRecovery: bill.lines.map((line) => ({ lineId: line.lineId, recoverable: Number(lineRecovery[line.lineId] ?? line.tax) })) } : {}) });
  async function previewCost() {
    if (!bill || lock.current) return; const generation = ++costRequest.current; lock.current = true; setBusy(true); setError("");
    try { const result = await apiRequest<{ split?: { recoverable: number; nonrecoverable: number }; costPreview?: InventoryVatPreviewData }>("/api/finance/input-vat/preview", { method: "POST", body: { documentId: bill.id, allocation: allocationBody(), evidenceReference: evidence } }); if (generation === costRequest.current) setCostCheck(result); }
    catch (e) { if (generation === costRequest.current) setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  async function submit() {
    if (!bill || lock.current) return; lock.current = true; setBusy(true);
    try { await apiRequest("/api/finance/input-vat/prepare", { method: "POST", body: { documentId: bill.id, allocation: allocationBody(), reason, evidenceReference: evidence, expectedCostDigest: costCheck?.costPreview?.digest } }); toast.success("Input-VAT allocation saved for independent finance review."); await load(); }
    catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  async function review(change: Review, approve: boolean) {
    if (lock.current) return; const reviewReason = reason.trim(); if (reviewReason.length < 5) { setError("Enter a review reason of at least five characters."); return; }
    lock.current = true; setBusy(true);
    try { await apiRequest(`/api/finance/input-vat/${encodeURIComponent(change._id)}/review`, { method: "POST", body: { digest: change.digest, approve, reason: reviewReason } }); toast.success(approve ? "Input-VAT treatment approved. The bill still needs normal posting." : "Proposal rejected."); await load(); }
    catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  return <PageLayout title="Input VAT review" description="Classify supplier VAT before posting; retain finance evidence for the claim."><div className="space-y-5">
    {!allowed ? <p role="alert">Finance and tax read permissions are required.</p> : <>
      <div className="rounded-2xl border bg-card p-5 text-sm"><p className="font-semibold">Direct, blocked and common input VAT</p><p className="mt-2 text-muted-foreground">Use the approved classification and turnover schedule. Proposed allocations require a different finance approver. Non-recoverable expense VAT follows the expense. Stock VAT is traced into remaining inventory, WIP, finished goods and consumed costs. Preview those destinations before independent approval.</p><Link className="mt-3 inline-block text-primary underline" href="/finance/tax">Tax definitions and registration setup</Link></div>
      {policy && !policy.confirmed && <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">Tax recovery setup is pending. Finance must supply and confirm the approved registration and input-VAT schedule before a bill allocation can be prepared.</div>}
      <Input aria-label="Search supplier bills" placeholder="Search supplier bill number…" value={search} onChange={(e) => setSearch(e.target.value)}/>
      {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,1fr)_2fr]"><section className="space-y-2 rounded-2xl border p-4"><h2 className="font-semibold">Supplier bills and corrections</h2>{loading ? <p role="status">Loading…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No bills match this view.</p> : rows.map((row) => <button key={row.id} disabled={busy} aria-pressed={selected === row.id} className={`w-full rounded-xl border p-3 text-left text-sm ${selected === row.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`} onClick={() => { setSelected(row.id); setDates({ accountingDate: row.date?.slice(0,10) ?? "", costPostingDate: row.date?.slice(0,10) ?? "" }); setLineRecovery({}); setCostCheck(null); setAllocation({ directTax: String(row.tax), blockedTax: "0", commonTax: "0", taxableTurnover: "0", totalTurnover: "0" }); setReason(""); setEvidence(""); }}><span className="block font-medium">{row.number}</span><span className="text-muted-foreground">VAT {row.currency} {row.tax.toLocaleString()} · {row.status}</span></button>)}{hasMore && <p className="text-xs text-muted-foreground">Showing 50 bills. Narrow the search to find another bill.</p>}</section>
      <section className="rounded-2xl border bg-card p-5">{!bill ? <p className="text-sm text-muted-foreground">Select a bill to prepare or review its VAT treatment.</p> : <><div className="flex items-center justify-between"><h2 className="font-semibold">{bill.number} · {bill.currency}</h2><Link className="text-sm text-primary underline" href={`/docs/${bill.type ?? "bill"}/${encodeURIComponent(bill.id)}`}>Open source bill</Link></div>
        <section className="mt-5 space-y-3 rounded-xl border bg-muted/20 p-4"><h3 className="text-sm font-semibold">Choose when the correction reaches the ledger</h3><p className="text-xs text-muted-foreground">Source invoice date: {bill.date?.slice(0,10) ?? "See source document"}. Keep the supplier date intact. Choose an open accounting date; a later cost date uses the dedicated VAT cost clearing account.</p><div className="grid gap-3 sm:grid-cols-2">{([['accountingDate', 'AP and tax accounting date'], ['costPostingDate', 'Inventory and consumed-cost date']] as const).map(([key,label]) => <label className="text-sm" key={key}>{label}<Input type="date" value={dates[key]} disabled={busy || !permissions.includes("finance.write")} onChange={(e) => setDates({ ...dates, [key]: e.target.value })}/></label>)}</div><Button variant="outline" size="sm" disabled={busy || !permissions.includes("finance.write")} onClick={() => { const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); setDates({ accountingDate: today, costPostingDate: today }); }}>Use today for both posting dates</Button></section>
        {bill.type && bill.type !== "bill" && <p className="mt-4 rounded-xl border p-3 text-sm">This correction keeps the original bill’s approved VAT recovery. Only its accounting dates and evidence are reviewed here.</p>}
        {(!bill.type || bill.type === "bill") && <div className="mt-5 grid gap-4 sm:grid-cols-2">{([['directTax', 'VAT directly attributable to taxable supplies'], ['blockedTax', 'Blocked / exempt-use VAT'], ['commonTax', 'Common VAT to apportion'], ['taxableTurnover', 'Taxable turnover from approved schedule'], ['totalTurnover', 'Total turnover from approved schedule']] as const).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<Input className="mt-1" required min={0} step="0.01" type="number" disabled={busy || (bill.type !== undefined && bill.type !== "bill") || !permissions.includes("finance.write")} value={allocation[key]} onChange={(e) => setAllocation({ ...allocation, [key]: e.target.value })}/></label>)}</div>}
        {(!bill.type || bill.type === "bill") && bill.lines && bill.lines.length > 1 && <section className="mt-5 space-y-3 rounded-xl border p-4"><h3 className="text-sm font-semibold">Recoverable VAT by source line</h3><p className="text-xs text-muted-foreground">Enter the approved recovery for each line. The sum must equal the direct/common recoverable total; blocked VAT stays with its own product or expense.</p>{bill.lines.map((line) => <label className="block text-xs" key={line.lineId}>{line.label} · source VAT {bill.currency} {line.tax}<Input type="number" min={0} max={line.tax} step="0.01" disabled={busy || !permissions.includes("finance.write")} value={lineRecovery[line.lineId] ?? String(line.tax)} onChange={(e) => setLineRecovery({ ...lineRecovery, [line.lineId]: e.target.value })}/></label>)}</section>}
        <label className="mt-4 block text-sm">Evidence reference<Input className="mt-1" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Approved schedule / tax invoice reference"/></label>
        <label className="mt-4 block text-sm">Preparation / review reason<textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-3" value={reason} onChange={(e) => setReason(e.target.value)}/></label>
        {permissions.includes("finance.write") && <Button className="mt-4" disabled={busy || policy?.confirmed === false || (bill.lines?.some((line) => line.productId) && (!costCheck || !costAuthority)) || reason.trim().length < 5 || evidence.trim().length < 5} onClick={() => void submit()}>Save for independent review</Button>}
        {bill.lines?.some((line) => line.productId) && !costAuthority && <p className="mt-4 text-sm text-muted-foreground">A reviewer with company cost scope must prepare the stock/production allocation. Your branch view remains read-only for this correction.</p>}
        {permissions.includes("finance.write") && <Button className="ml-2 mt-4" variant="outline" disabled={busy || policy?.confirmed === false || (bill.lines?.some((line) => line.productId) && !costAuthority) || evidence.trim().length < 5} onClick={() => void previewCost()}>Preview tax and cost allocation</Button>}
        {costCheck && <div className="mt-5">{costCheck.split && <p className="mb-3 text-sm">Reviewed recovery: {bill.currency} {costCheck.split.recoverable.toLocaleString()} · non-recoverable: {bill.currency} {costCheck.split.nonrecoverable.toLocaleString()}</p>}{costCheck.costPreview ? <InventoryVatPreview preview={costCheck.costPreview}/> : <p role="status" className="rounded-xl border p-4 text-sm">Tax preview checked. No stock capitalisation is required for this treatment.</p>}</div>}
        <div className="mt-6 space-y-3">{bill.reviews.map((change) => <div key={change._id} className="rounded-xl border p-4 text-sm"><p className="font-semibold">{change.state}{bill.inputVatChangeId === change._id ? " · Applied to this bill" : ""}</p><p className="mt-2">Recoverable {bill.currency} {change.payload.recoverable.toLocaleString()} · Non-recoverable {bill.currency} {change.payload.nonrecoverable.toLocaleString()}</p>{change.payload.costPreview && <div className="my-4"><InventoryVatPreview preview={change.payload.costPreview}/></div>}{change.payload.inventoryCostRestricted && <p className="mt-2 text-xs text-muted-foreground">A finance reviewer with company cost scope must review the stock and production allocation.</p>}<p className="mt-2 whitespace-pre-wrap text-muted-foreground">{change.reason}</p><p className="mt-1 text-xs text-muted-foreground">{change.evidenceReference} · Prepared by {change.proposedBy}</p>{change.state === "PENDING" && !change.payload.inventoryCostRestricted && permissions.includes("finance.approve") && change.proposedBy !== user && <div className="mt-3 flex gap-2"><Button size="sm" disabled={busy} onClick={() => void review(change, true)}>Approve shown allocation</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void review(change, false)}>Reject</Button></div>}</div>)}</div>
      </>}</section></div>
    </>}
  </div></PageLayout>;
}
