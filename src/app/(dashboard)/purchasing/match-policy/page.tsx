"use client";
import * as React from "react";
import { CheckCheck, Settings2, RefreshCw } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { fetchPartiesPageApi } from "@/lib/api/parties";
import { toast } from "sonner";
type Values = { qtyTolerancePct: number; amountTolerancePct: number; supplierOverrides: Array<{ supplierId: string; qtyTolerancePct: number; amountTolerancePct: number }> };
type Policy = Values & { revision: number; reason: string; proposedBy: string; approvedBy?: string };
type Response = { contract: string; supplierNames?: Record<string, string>; revision: number; active?: Policy; proposal?: Policy; effective: { qtyTolerancePct: number; amountTolerancePct: number; revision: number; source: string } };
export default function PurchaseMatchPolicyPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const orgId = useAuthStore((s) => s.org?.orgId);
  const userId = useAuthStore((s) => s.user?.userId);
  const allowed = permissions.includes("finance.read");
  const [policy, setPolicy] = React.useState<Response | null>(null);
  const [draft, setDraft] = React.useState<Values>({ qtyTolerancePct: 2, amountTolerancePct: 2, supplierOverrides: [] });
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const request = React.useRef(0);
  const invalidate = React.useCallback(() => { request.current++; }, []);
  const load = React.useCallback(async () => {
    const generation = ++request.current;
    if (!allowed || !orgId) { setLoading(false); return; }
    setLoading(true); setError("");
    try { const next = await apiRequest<Response>("/api/purchasing/match-policy"); if (generation !== request.current) return; if (next.contract !== "purchase-policy-v1") throw new Error("Purchasing policy requires the updated backend."); setPolicy(next); setDraft(next.proposal ?? next.active ?? { ...next.effective, supplierOverrides: [] }); }
    catch (e) { if (generation === request.current) setError((e as Error).message); }
    finally { if (generation === request.current) setLoading(false); }
  }, [allowed, orgId]);
  React.useEffect(() => { setPolicy(null); void load(); return invalidate; }, [load, invalidate]);
  async function save(approve: boolean) {
    if (!policy) return;
    setBusy(true);
    try {
      await apiRequest(`/api/purchasing/match-policy/${approve ? "approve" : "propose"}`, { method: "POST", body: approve ? { revision: policy.proposal!.revision } : { qtyTolerancePct: Number(draft.qtyTolerancePct), amountTolerancePct: Number(draft.amountTolerancePct), supplierOverrides: draft.supplierOverrides, revision: policy.revision, reason } });
      toast.success(approve ? "Policy approved. New matches and payment checks use this revision." : "Draft saved for a different finance approver."); setReason(""); await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return <PageLayout title="Purchasing policy" description="Clear tolerances. Consistent invoice and payment controls." actions={<Button variant="outline" disabled={busy || loading} onClick={() => void load()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>}>
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-6">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6"><Settings2 className="mb-4 size-7 text-primary"/><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Purchase to pay</p><h2 className="mt-2 text-2xl font-semibold">One policy from receipt to settlement</h2><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Set separate limits for excess receipt quantities and invoice price differences. The same approved policy is rechecked before supplier payment. Bills can never consume quantities that were not received.</p></section>
      {!allowed ? <p role="alert" className="rounded-xl border p-5">Finance read permission is required.</p> : loading ? <p role="status" className="p-6">Loading policy…</p> : error ? <p role="alert" className="rounded-xl border border-destructive/40 p-5">{error}</p> : policy && <>
        <section className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2"><CheckCheck className="size-5 text-primary"/><h3 className="font-semibold">Effective policy · revision {policy.effective.revision}</h3></div><p className="mt-2 text-sm text-muted-foreground">{policy.active ? `Approved by ${policy.active.approvedBy}. Supplier overrides are listed below.` : "Legacy 2% limits remain active until an independently approved policy replaces them. These defaults are not finance approval."}</p><div className="mt-4 grid grid-cols-2 gap-4">{[["Receipt quantity tolerance", policy.effective.qtyTolerancePct], ["Invoice price tolerance", policy.effective.amountTolerancePct]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}%</p></div>)}</div>{policy.active?.supplierOverrides.length ? <div className="mt-4 overflow-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-medium">Approved supplier overrides</caption><thead><tr><th className="p-2">Supplier ID</th><th>Quantity</th><th>Price</th></tr></thead><tbody>{policy.active.supplierOverrides.map((row) => <tr key={row.supplierId} className="border-t"><td className="break-all p-2">{policy.supplierNames?.[row.supplierId] ?? row.supplierId}</td><td>{row.qtyTolerancePct}%</td><td>{row.amountTolerancePct}%</td></tr>)}</tbody></table></div> : null}</section>
        {policy.proposal && <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"><h3 className="font-semibold">Revision {policy.proposal.revision} awaits independent approval</h3><p className="mt-2 text-sm">Quantity {policy.proposal.qtyTolerancePct}% · Price {policy.proposal.amountTolerancePct}% · {policy.proposal.supplierOverrides.length} supplier overrides</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{policy.proposal.reason}</p><p className="mt-2 text-xs text-muted-foreground">Prepared by {policy.proposal.proposedBy}</p>{policy.proposal.supplierOverrides.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer">Review proposed supplier overrides</summary><ul className="mt-2 space-y-2">{policy.proposal.supplierOverrides.map((row) => <li key={row.supplierId} className="break-all">{policy.supplierNames?.[row.supplierId] ?? row.supplierId}: quantity {row.qtyTolerancePct}%, price {row.amountTolerancePct}%</li>)}</ul></details>}{permissions.includes("finance.approve") && policy.proposal.proposedBy !== userId ? <Button className="mt-4" disabled={busy} onClick={() => void save(true)}>Approve this policy revision</Button> : <p className="mt-3 text-sm text-muted-foreground">A different finance approver must approve this revision.</p>}</section>}
        {permissions.includes("admin.settings") && permissions.includes("finance.write") && <form onSubmit={(e) => { e.preventDefault(); void save(false); }} className="space-y-5 rounded-2xl border bg-card p-5"><div><h3 className="font-semibold">Prepare a policy revision</h3><p className="mt-1 text-sm text-muted-foreground">Changes remain a proposal until reviewed. Zero means no variance is permitted. Identity, UOM, tax and receipt availability checks remain mandatory.</p></div><div className="grid gap-4 sm:grid-cols-2">{([['qtyTolerancePct', 'Receipt quantity tolerance (%)'], ['amountTolerancePct', 'Invoice price tolerance (%)']] as const).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<Input className="mt-2" required type="number" min={0} max={100} step="0.01" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}/></label>)}</div>
          <div className="space-y-3"><p className="text-sm font-medium">Supplier-specific rules</p>{draft.supplierOverrides.map((row, index) => <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"><div className="text-xs"><span className="mb-1 block font-medium">Supplier</span><AsyncSearchableSelect value={row.supplierId} selectedOption={row.supplierId ? { id: row.supplierId, label: policy.supplierNames?.[row.supplierId] ?? row.supplierId } : null} placeholder="Choose supplier" searchPlaceholder="Search supplier name or code" loadOptions={async (search, page) => { const result = await fetchPartiesPageApi({ role: "supplier", search, limit: 40, cursor: page?.cursor ?? undefined }); return { options: result.items.map((party) => ({ id: party.id, label: party.name, description: party.code })), nextCursor: result.nextCursor }; }} onValueChange={(supplierId) => setDraft({ ...draft, supplierOverrides: draft.supplierOverrides.map((v, i) => i === index ? { ...v, supplierId } : v) })}/></div>{(['qtyTolerancePct', 'amountTolerancePct'] as const).map((key) => <label key={key} className="text-xs">{key === 'qtyTolerancePct' ? 'Quantity %' : 'Price %'}<Input className="mt-1" required type="number" min={0} max={100} step="0.01" value={row[key]} onChange={(e) => setDraft({ ...draft, supplierOverrides: draft.supplierOverrides.map((v, i) => i === index ? { ...v, [key]: Number(e.target.value) } : v) })}/></label>)}<Button type="button" variant="ghost" className="self-end" onClick={() => setDraft({ ...draft, supplierOverrides: draft.supplierOverrides.filter((_, i) => i !== index) })}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={draft.supplierOverrides.length >= 200} onClick={() => setDraft({ ...draft, supplierOverrides: [...draft.supplierOverrides, { supplierId: '', qtyTolerancePct: draft.qtyTolerancePct, amountTolerancePct: draft.amountTolerancePct }] })}>Add supplier rule</Button></div>
          <label className="block text-sm font-medium">Reason for this change<textarea className="mt-2 min-h-24 w-full rounded-md border bg-background p-3" required minLength={5} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)}/></label><Button type="submit" disabled={busy}>Save for independent approval</Button></form>}
      </>}
    </div>
  </PageLayout>;
}
