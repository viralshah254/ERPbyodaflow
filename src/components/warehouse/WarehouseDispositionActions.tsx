"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveWarehouseDispositionApi, updateWarehouseApi } from "@/lib/api/warehouses";
import type { WarehouseRow } from "@/lib/types/masters";
import { toast } from "sonner";

export function WarehouseDispositionActions({ row, canWrite, onChanged }: { row: WarehouseRow; canWrite: boolean; onChanged: () => Promise<void> }) {
  const [target, setTarget] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const run = async (approve: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (approve) await approveWarehouseDispositionApi(row.id);
      const updated = approve ? null : await updateWarehouseApi(row.id, { stockDisposition: target });
      toast.success(approve || !updated?.dispositionPending ? "Stock disposition approved." : "Disposition requested. A different authorized person must approve it.");
      setTarget(""); await onChanged();
    } catch (error) { toast.error(error instanceof Error ? error.message : "The disposition could not be updated."); }
    finally { setBusy(false); }
  };
  return <div className="min-w-[230px] space-y-2" onClick={(event) => event.stopPropagation()}>
    <Badge variant="outline">{row.stockDisposition ?? (row.purpose ? `By purpose: ${row.purpose.toLowerCase()}` : "Needs classification")}</Badge>
    {row.dispositionPending ? <div className="space-y-2"><p className="text-xs text-amber-700 dark:text-amber-400">Awaiting independent approval: {row.dispositionPending.toLowerCase()}. Hold requests already exclude this store from supply.</p>{canWrite && <Button size="sm" disabled={busy} onClick={() => void run(true)}>{busy ? "Updating…" : "Review and approve"}</Button>}</div> : canWrite && <div className="flex flex-wrap items-center gap-2"><select aria-label={`Requested disposition for ${row.name}`} value={target} onChange={(event) => setTarget(event.target.value)} disabled={busy} className="h-8 max-w-full rounded-md border bg-background px-2 text-xs"><option value="">Change disposition…</option>{["USABLE", "QUARANTINE", "DAMAGED", "EXPIRED", "TRANSIT"].filter((value) => value !== row.stockDisposition).map((value) => <option key={value} value={value}>{value === "USABLE" ? "Release as usable" : value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select><Button size="sm" variant="outline" disabled={!target || busy} onClick={() => void run(false)}>{busy ? "Requesting…" : "Request"}</Button></div>}
  </div>;
}
