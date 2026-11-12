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
  searchInventoryLotsApi,
  type InventoryLotOption,
  type InventoryQualityCase,
} from "@/lib/api/inventory-quality";

export default function InventoryQualityPage() {
  const [items, setItems] = React.useState<InventoryQualityCase[]>([]);
  const [kind, setKind] = React.useState<"QUALITY" | "LOSS" | "RECALL">("QUALITY");
  const [selectedLot, setSelectedLot] = React.useState<InventoryLotOption>();
  const [searchingLots, setSearchingLots] = React.useState(false);
  const [lotSearchFailed, setLotSearchFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [lotQuery, setLotQuery] = React.useState("");
  const [lotOptions, setLotOptions] = React.useState<InventoryLotOption[]>([]);
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [capa, setCapa] = React.useState<Record<string, string>>({});

  const refresh = React.useCallback(async () => {
    try { setItems(await fetchInventoryQualityCasesApi()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Failed to load quality cases."); }
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (selectedLot || !lotQuery.trim()) return;
    let current = true;
    setSearchingLots(true);
    setLotSearchFailed(false);
    const handle = window.setTimeout(async () => {
      try {
        const matches = await searchInventoryLotsApi(lotQuery.trim());
        if (current) setLotOptions(matches);
      } catch {
        if (current) setLotSearchFailed(true);
      } finally {
        if (current) setSearchingLots(false);
      }
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(handle);
    };
  }, [lotQuery, selectedLot]);

  const affectedQuantity = Number(quantity);
  const canOpen = Boolean(selectedLot && quantity.trim() && Number.isFinite(affectedQuantity) &&
    (kind === "RECALL" ? affectedQuantity >= 0 : affectedQuantity > 0) &&
    affectedQuantity <= selectedLot.remainingQuantity && reason.trim());

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
            <div className="space-y-1">
              <Label htmlFor="quality-lot-search">Lot</Label>
              <Input id="quality-lot-search" value={lotQuery} onChange={(e) => {
                setLotQuery(e.target.value);
                setSelectedLot(undefined);
                setQuantity("");
                setLotOptions([]);
                setLotSearchFailed(false);
                setSearchingLots(Boolean(e.target.value.trim()));
              }} placeholder="Search lot number" />
              {!selectedLot && lotOptions.length > 0 ? (
                <div className="max-h-40 overflow-auto rounded-md border">
                  {lotOptions.map((lot) => (
                    <button
                      key={lot.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedLot(lot);
                        setLotQuery(lot.lotNumber);
                        setQuantity(String(lot.remainingQuantity ?? ""));
                      }}
                    >
                      {[lot.lotNumber, [lot.productSku, lot.productName].filter(Boolean).join(" "), `${lot.remainingQuantity} left`, lot.status].filter(Boolean).join(" · ")}
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedLot ? (
                <p className="text-sm text-muted-foreground">Selected {selectedLot.lotNumber} · {selectedLot.productName || selectedLot.productSku} · {selectedLot.remainingQuantity} on hand</p>
              ) : lotSearchFailed ? (
                <p role="alert" className="text-sm text-destructive">Lot search failed. Edit the search to try again.</p>
              ) : lotQuery.trim() ? (
                <p role="status" className="text-sm text-muted-foreground">{searchingLots ? "Searching lots…" : lotOptions.length === 0 ? "No matching lots." : "Choose the lot to use."}</p>
              ) : null}
            </div>
            <div className="space-y-1"><Label htmlFor="quality-quantity">Affected quantity</Label><Input id="quality-quantity" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="quality-reason">Reason / evidence</Label><Input id="quality-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            {selectedLot && affectedQuantity > selectedLot.remainingQuantity && (
              <p role="alert" className="text-sm text-destructive">Enter {selectedLot.remainingQuantity} or fewer for this lot.</p>
            )}
            <Button className="w-full" disabled={!canOpen || saving} onClick={async () => {
              if (!selectedLot || !canOpen || saving) return;
              setSaving(true);
              try {
                const result = await createInventoryQualityCaseApi({ kind, lotId: selectedLot.id, affectedQuantity, reason: reason.trim() });
                toast.success(kind === "RECALL" ? `Recall opened; ${result.linkedDocumentCount} delivery document(s) traced.` : "Case opened.");
                setSelectedLot(undefined); setLotQuery(""); setLotOptions([]); setQuantity(""); setReason(""); await refresh();
              } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to open case."); }
              finally { setSaving(false); }
            }}>{saving ? "Opening case…" : "Open case"}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cases</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-medium">{item.kind === "QUALITY" ? "Quality hold" : item.kind === "LOSS" ? "Loss" : "Recall"}{item.lotNumber ? ` · Lot ${item.lotNumber}` : ""}{[item.productSku, item.productName].filter(Boolean).length ? ` · ${[item.productSku, item.productName].filter(Boolean).join(" ")}` : ""}</p><p className="text-sm text-muted-foreground">{item.reason} · {item.affectedQuantity} units{item.lossValue != null ? ` · KES ${item.lossValue.toLocaleString()}` : ""} · {item.documentIds.length} linked document(s)</p></div>
                  <Badge>{item.status}</Badge>
                </div>
                {item.status !== "CLOSED" ? <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {item.kind === "LOSS" && item.status === "OPEN" ? <Button size="sm" variant="outline" onClick={async () => { try { await actionInventoryQualityCaseApi(item._id, "approve-loss"); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Loss approval failed."); } }}>Approve loss value</Button> : null}
                  {item.kind === "LOSS" && item.status === "APPROVED" ? <Button size="sm" variant="destructive" onClick={async () => { try { await actionInventoryQualityCaseApi(item._id, "post-loss"); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Loss post failed."); } }}>Post approved loss</Button> : null}
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
