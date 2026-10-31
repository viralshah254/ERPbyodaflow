"use client";
import * as React from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api/client";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";

type Lot = { _id: string; lotNumber: string; productName: string; warehouseName: string; remainingQuantity: number; expiryDate?: string };
export default function ProductionQualityPage() {
  const canDecide = useHasPermission("inventory.qc.write");
  const [rows, setRows] = React.useState<Lot[]>([]);
  const [selected, setSelected] = React.useState<Lot | null>(null);
  const [reason, setReason] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [outcome, setOutcome] = React.useState("ACCEPTED");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const refresh = React.useCallback(async () => {
    try { setRows((await apiRequest<{ items: Lot[] }>("/api/inventory/production-lots/qc")).items); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load production lots."); }
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return; setBusy(true);
    try {
      await apiRequest(`/api/inventory/production-lots/${encodeURIComponent(selected._id)}/qc`, { method: "POST", body: { outcome, reason, ...(expiry ? { expiryDate: `${expiry}T23:59:59.999+03:00` } : {}) } });
      toast.success(outcome === "ACCEPTED" ? "Lot released for allocation." : "Lot rejected and kept unavailable. Record any disposal through an approved inventory loss.");
      setSelected(null); setReason(""); await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "QC decision failed."); }
    finally { setBusy(false); }
  }
  return <PageShell><PageHeader title="Production quality release" description="Review finished batches before they become available for allocation." actions={<Button asChild variant="outline"><Link href="/manufacturing/work-orders">Production batches</Link></Button>} />
    <div className="space-y-4 p-6">{error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Lot</th><th>Product</th><th>Warehouse</th><th>Quantity</th><th /></tr></thead><tbody>{rows.map((lot) => <tr key={lot._id} className="border-b"><td className="p-3">{lot.lotNumber}</td><td>{lot.productName}</td><td>{lot.warehouseName}</td><td>{lot.remainingQuantity}</td><td>{canDecide && <Button size="sm" variant="outline" onClick={() => { setSelected(lot); setReason(""); setExpiry(lot.expiryDate?.slice(0, 10) ?? ""); }}>Review QC</Button>}</td></tr>)}</tbody></table></div>
      {!error && rows.length === 0 && <p className="text-muted-foreground">No production lots are awaiting QC.</p>}
      {selected && <form onSubmit={save} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2"><p className="md:col-span-2 font-medium">{selected.productName} · {selected.lotNumber}</p>
        <div><Label htmlFor="lot-outcome">Decision</Label><select id="lot-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="ACCEPTED">Accept and release</option><option value="REJECTED">Reject and hold</option></select></div>
        <div><Label htmlFor="lot-expiry">Expiry date</Label><Input id="lot-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
        <div className="md:col-span-2"><Label htmlFor="lot-reason">QC findings / reason</Label><Input id="lot-reason" required value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <Button type="submit" disabled={busy}>Record decision</Button><Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
      </form>}
    </div></PageShell>;
}
