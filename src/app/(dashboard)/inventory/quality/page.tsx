"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  actionInventoryQualityCaseApi,
  createInventoryQualityCaseApi,
  fetchInventoryQualityCasesApi,
  type InventoryQualityCase,
} from "@/lib/api/inventory-quality";

export default function InventoryQualityPage() {
  const [items, setItems] = React.useState<InventoryQualityCase[]>([]);
  const [kind, setKind] = React.useState<"QUALITY" | "LOSS" | "RECALL">("QUALITY");
  const [lotId, setLotId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [capa, setCapa] = React.useState<Record<string, string>>({});

  const refresh = React.useCallback(async () => {
    try { setItems(await fetchInventoryQualityCasesApi()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Failed to load quality cases."); }
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);

  return (
    <PageShell>
      <PageHeader
        title="Quality, Loss & Recall"
        description="Contain lots, trace recalls to deliveries, post approved losses, and require CAPA before close."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/stock-levels" }, { label: "Quality & Recall" }]}
      />
      <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Open a case</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label>Type</Label><Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="QUALITY">Quality hold</SelectItem><SelectItem value="LOSS">Loss</SelectItem><SelectItem value="RECALL">Recall</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Lot ID</Label><Input value={lotId} onChange={(e) => setLotId(e.target.value)} /></div>
            <div className="space-y-1"><Label>Affected quantity</Label><Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div className="space-y-1"><Label>Reason / evidence</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <Button className="w-full" onClick={async () => {
              try {
                const result = await createInventoryQualityCaseApi({ kind, lotId, affectedQuantity: Number(quantity) || 0, reason });
                toast.success(kind === "RECALL" ? `Recall opened; ${result.linkedDocumentCount} delivery document(s) traced.` : "Case opened.");
                setLotId(""); setQuantity(""); setReason(""); await refresh();
              } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to open case."); }
            }}>Open case</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cases</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-medium">{item.kind} · {item.lotId}</p><p className="text-sm text-muted-foreground">{item.reason} · {item.affectedQuantity} units · {item.documentIds.length} linked document(s)</p></div>
                  <Badge>{item.status}</Badge>
                </div>
                {item.status !== "CLOSED" ? <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {item.kind === "LOSS" && item.status === "OPEN" ? <Button size="sm" variant="destructive" onClick={async () => { try { await actionInventoryQualityCaseApi(item._id, "post-loss"); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Loss post failed."); } }}>Post loss to stock ledger</Button> : null}
                  <Input className="sm:max-w-xs" placeholder="Corrective / preventive action (CAPA)" value={capa[item._id] ?? ""} onChange={(e) => setCapa((current) => ({ ...current, [item._id]: e.target.value }))} />
                  <Button size="sm" variant="outline" onClick={async () => { try { await actionInventoryQualityCaseApi(item._id, "close", capa[item._id]); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Close failed."); } }}>Close with CAPA</Button>
                </div> : <p className="mt-2 text-sm text-muted-foreground">CAPA: {item.capa}</p>}
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-muted-foreground">No quality cases.</p> : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
