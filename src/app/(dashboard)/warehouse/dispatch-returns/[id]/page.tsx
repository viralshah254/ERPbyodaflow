"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchPendingWarehouseDrops,
  postWarehouseDropReceive,
  type PendingWarehouseDropRow,
} from "@/lib/api/dispatch-warehouse";
import { toast } from "sonner";

export default function DispatchReturnDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [row, setRow] = React.useState<PendingWarehouseDropRow | null | undefined>(undefined);
  const [weights, setWeights] = React.useState<Record<string, string>>({});
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchPendingWarehouseDrops()
      .then((items) => {
        if (cancelled) return;
        const found = items.find((r) => r.deliveryNoteId === id) ?? null;
        setRow(found);
        if (found) {
          const init: Record<string, string> = {};
          for (const l of found.lines) {
            init[l.lineId] = String(l.droppedWeightKg);
          }
          setWeights(init);
        }
      })
      .catch(() => {
        if (!cancelled) setRow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onPost = async () => {
    if (!row) return;
    setPosting(true);
    try {
      const lines = row.lines.map((l) => ({
        lineId: l.lineId,
        receivedWeightKg: Number(weights[l.lineId] ?? l.droppedWeightKg),
      }));
      await postWarehouseDropReceive(id, lines);
      toast.success("Stock posted to warehouse");
      setRow(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Post failed");
    } finally {
      setPosting(false);
    }
  };

  if (row === undefined) {
    return (
      <PageShell>
        <PageHeader title="Driver return" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Driver returns", href: "/warehouse/dispatch-returns" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  if (!row) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Driver returns", href: "/warehouse/dispatch-returns" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Return not found or already posted.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/dispatch-returns">Back</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`Return ${row.number}`}
        description={`Driver ${row.dispatcherName} · dropped ${new Date(row.droppedAt).toLocaleString()}`}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Driver returns", href: "/warehouse/dispatch-returns" },
          { label: row.number },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/docs/delivery-note/${id}`}>Delivery note</Link>
          </Button>
        }
      />
      <div className="p-6 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weigh & post to stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {row.lines.map((l) => (
              <div key={l.lineId} className="space-y-2">
                <Label htmlFor={`w-${l.lineId}`}>Line {l.lineId} — received kg</Label>
                <Input
                  id={`w-${l.lineId}`}
                  type="number"
                  step="0.01"
                  value={weights[l.lineId] ?? ""}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [l.lineId]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Driver dropped: {l.droppedWeightKg} kg</p>
              </div>
            ))}
            <Button onClick={onPost} disabled={posting}>
              {posting ? "Posting…" : "Post to stock"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
