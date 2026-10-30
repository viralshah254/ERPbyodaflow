"use client";
import * as React from "react";
import { apiRequest } from "@/lib/api/client";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ProductStockPolicy({ productId }: { productId: string }) {
  const canEdit = useHasPermission("catalog.write");
  const [point, setPoint] = React.useState("");
  const [tracking, setTracking] = React.useState("NONE");
  const [shelf, setShelf] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    let active = true;
    void apiRequest<{ reorderPoint?: number; trackingPolicy?: string; shelfLifeDays?: number }>(`/api/products/${encodeURIComponent(productId)}`).then((row) => {
      if (active) { setPoint(String(row.reorderPoint ?? 0)); setTracking(row.trackingPolicy ?? "NONE"); setShelf(row.shelfLifeDays ? String(row.shelfLifeDays) : ""); }
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load inventory policy."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);
  return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Stock alerts and batch policy</h3>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="grid gap-4 md:grid-cols-3"><div><Label htmlFor="stock-reorder">Reorder point in base units</Label><Input id="stock-reorder" type="number" min="0" step="0.001" disabled={!canEdit || loading} value={point} onChange={(e) => setPoint(e.target.value)} /></div>
      <div><Label htmlFor="stock-tracking">Batch tracking</Label><select id="stock-tracking" value={tracking} disabled={!canEdit || loading} onChange={(e) => setTracking(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="NONE">Standard</option><option value="LOT">Lot-controlled (released, unexpired lots required)</option></select></div>
      <div><Label htmlFor="stock-shelf">Manufactured shelf life (days)</Label><Input id="stock-shelf" type="number" min="1" step="1" disabled={!canEdit || loading} value={shelf} onChange={(e) => setShelf(e.target.value)} /></div></div>
    <p className="text-xs text-muted-foreground">A zero reorder point disables the alert. Lot-controlled existing stock must have valid released lots before it can be issued.</p>
    {canEdit && <Button disabled={loading || Boolean(error)} onClick={async () => { setLoading(true); try { await apiRequest(`/api/products/${encodeURIComponent(productId)}`, { method: "PATCH", body: { reorderPoint: Number(point), trackingPolicy: tracking, ...(shelf ? { shelfLifeDays: Number(shelf) } : {}) } }); toast.success("Stock policy saved."); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save stock policy."); } finally { setLoading(false); } }}>Save stock policy</Button>}
  </section>;
}
