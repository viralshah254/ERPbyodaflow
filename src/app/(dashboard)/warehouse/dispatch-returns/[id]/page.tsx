"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchDriverReturnBoard,
  postDriverReturn,
  postWarehouseDropReceive,
  type OpenDriverReturnRow,
  type PendingWarehouseDropRow,
} from "@/lib/api/dispatch-warehouse";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";

type ReturnLineState = {
  returnedQty: string;
  condition: "GOOD" | "DAMAGED";
};

export default function DispatchReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const canWrite = useCanWriteInventory();
  const [onRoad, setOnRoad] = React.useState<OpenDriverReturnRow | null | undefined>(undefined);
  const [pending, setPending] = React.useState<PendingWarehouseDropRow | null>(null);
  const [weights, setWeights] = React.useState<Record<string, string>>({});
  const [returns, setReturns] = React.useState<Record<string, ReturnLineState>>({});
  const [driverName, setDriverName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<LookupOption[]>([]);
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchDriverReturnBoard()
      .then((board) => {
        if (cancelled) return;
        const road = board.onRoad.find((row) => row.deliveryNoteId === id) ?? null;
        const drop = board.pending.find((row) => row.deliveryNoteId === id) ?? null;
        setOnRoad(road);
        setPending(drop);
        if (road) {
          const init: Record<string, ReturnLineState> = {};
          for (const line of road.lines) {
            init[line.lineId] = { returnedQty: "", condition: "GOOD" };
          }
          setReturns(init);
          if (road.warehouseId) setWarehouseId(road.warehouseId);
        }
        if (drop) {
          const init: Record<string, string> = {};
          for (const line of drop.lines) {
            init[line.lineId] = String(line.droppedWeightKg);
          }
          setWeights(init);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setOnRoad(null);
          toast.error(error instanceof Error ? error.message : "Could not load this return.");
        }
      });
    void fetchWarehouseOptions()
      .then(setWarehouses)
      .catch(() => {
        /* Warehouse list is required to post; the form shows an empty selector. */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const postReturn = async () => {
    if (!onRoad) return;
    if (!driverName.trim()) {
      toast.error("Enter the driver name.");
      return;
    }
    if (!warehouseId) {
      toast.error("Select the warehouse taking the goods back.");
      return;
    }
    const lines = onRoad.lines.map((line) => ({
      lineId: line.lineId,
      returnedQty: Number(returns[line.lineId]?.returnedQty || 0),
      condition: returns[line.lineId]?.condition ?? "GOOD",
    }));
    if (!lines.some((line) => line.returnedQty > 0)) {
      toast.error("Enter a returned quantity on at least one line.");
      return;
    }
    setPosting(true);
    try {
      const result = await postDriverReturn(id, {
        dispatcherName: driverName.trim(),
        warehouseId,
        note: note.trim() || undefined,
        lines,
      });
      toast.success(
        result.fullReturn
          ? "Full load posted back to the warehouse."
          : "Return posted. Goods the customer kept stay on the delivery note."
      );
      router.push("/warehouse/dispatch-returns");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Post failed");
    } finally {
      setPosting(false);
    }
  };

  const postPending = async () => {
    if (!pending) return;
    setPosting(true);
    try {
      const lines = pending.lines.map((line) => ({
        lineId: line.lineId,
        receivedWeightKg: Number(weights[line.lineId] ?? line.droppedWeightKg),
      }));
      await postWarehouseDropReceive(id, lines);
      toast.success("Stock posted to the warehouse.");
      router.push("/warehouse/dispatch-returns");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Post failed");
    } finally {
      setPosting(false);
    }
  };

  if (onRoad === undefined) {
    return (
      <PageShell>
        <PageHeader
          title="Driver return"
          breadcrumbs={[
            { label: "Warehouse", href: "/warehouse/overview" },
            { label: "Driver returns", href: "/warehouse/dispatch-returns" },
            { label: id },
          ]}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  if (!onRoad && !pending) {
    return (
      <PageShell>
        <PageHeader
          title="Not found"
          breadcrumbs={[
            { label: "Warehouse", href: "/warehouse/overview" },
            { label: "Driver returns", href: "/warehouse/dispatch-returns" },
            { label: id },
          ]}
        />
        <div className="p-6">
          <p className="text-muted-foreground">This note is not out with a driver, or the return was already posted.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/dispatch-returns">Back</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  if (onRoad) {
    return (
      <PageShell>
        <PageHeader
          title={`Return ${onRoad.number}`}
          description="Count what the truck brought back. Good quantity is added to stock in the same unit that was dispatched."
          breadcrumbs={[
            { label: "Warehouse", href: "/warehouse/overview" },
            { label: "Driver returns", href: "/warehouse/dispatch-returns" },
            { label: onRoad.number },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/docs/delivery-note/${id}`}>Delivery note</Link>
            </Button>
          }
        />
        <div className="max-w-2xl space-y-4 p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="return-driver">Driver</Label>
                <Input id="return-driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" />
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger aria-label="Warehouse">
                    <SelectValue placeholder={warehouses.length ? "Select warehouse…" : "No warehouses found"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="return-note">Note</Label>
                <Input id="return-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {onRoad.lines.map((line) => {
                const state = returns[line.lineId] ?? { returnedQty: "", condition: "GOOD" as const };
                const unit = line.unit || "PCS";
                return (
                  <div key={line.lineId} className="space-y-2 border-b border-border pb-4 last:border-0">
                    <p className="text-sm font-medium">{line.description || line.lineId}</p>
                    <p className="text-xs text-muted-foreground">
                      Dispatched {line.shippedQty} {unit}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                      <div className="space-y-2">
                        <Label htmlFor={`qty-${line.lineId}`}>Returned ({unit})</Label>
                        <Input
                          id={`qty-${line.lineId}`}
                          type="number"
                          min={0}
                          step="any"
                          value={state.returnedQty}
                          onChange={(e) =>
                            setReturns((prev) => ({
                              ...prev,
                              [line.lineId]: { ...state, returnedQty: e.target.value },
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select
                          value={state.condition}
                          onValueChange={(value) =>
                            setReturns((prev) => ({
                              ...prev,
                              [line.lineId]: { ...state, condition: value === "DAMAGED" ? "DAMAGED" : "GOOD" },
                            }))
                          }
                        >
                          <SelectTrigger aria-label={`Condition for ${line.description || "line"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GOOD">Good — back to stock</SelectItem>
                            <SelectItem value="DAMAGED">Damaged — not sellable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
              {canWrite ? (
                <Button onClick={() => void postReturn()} disabled={posting}>
                  {posting ? "Posting…" : "Post return"}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`Return ${pending!.number}`}
        description={`Driver ${pending!.dispatcherName} · dropped ${new Date(pending!.droppedAt).toLocaleString()}`}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Driver returns", href: "/warehouse/dispatch-returns" },
          { label: pending!.number },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/docs/delivery-note/${id}`}>Delivery note</Link>
          </Button>
        }
      />
      <div className="max-w-xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirm quantity and post to stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending!.lines.map((line) => (
              <div key={line.lineId} className="space-y-2">
                <Label htmlFor={`w-${line.lineId}`}>
                  {line.description || "Line"} — received {line.unit || "qty"}
                </Label>
                <Input
                  id={`w-${line.lineId}`}
                  type="number"
                  step="any"
                  value={weights[line.lineId] ?? ""}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [line.lineId]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Driver dropped {line.droppedWeightKg}
                  {line.shippedQty != null ? ` · dispatched ${line.shippedQty}` : ""}
                </p>
              </div>
            ))}
            {canWrite ? (
              <Button onClick={() => void postPending()} disabled={posting}>
                {posting ? "Posting…" : "Post to stock"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
