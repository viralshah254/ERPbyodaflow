"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPickPackTask, runPickPackAction, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { toast } from "sonner";

export default function PickPackDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = React.useState<WarehousePickPackRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cartons, setCartons] = React.useState("0");
  const [packingNote, setPackingNote] = React.useState("");
  const [courier, setCourier] = React.useState("");
  const [trackingRef, setTrackingRef] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchPickPackTask(id);
      setTask(payload);
      setCartons(String(payload?.cartonsCount ?? 0));
      setPackingNote(payload?.packingNote ?? "");
      setCourier(payload?.courier ?? "");
      setTrackingRef(payload?.trackingRef ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load task.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!task && loading) {
    return <PageShell><PageHeader title="Loading task..." /></PageShell>;
  }

  if (!task) {
    return (
      <PageShell>
        <PageHeader title="Task not found" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`${task.reference} - ${task.status}`}
        description={
          task.sourceDocumentNumber
            ? `${task.customer ?? "Customer"} · Delivery ${task.sourceDocumentNumber} (${task.sourceDocumentStatus ?? "DRAFT"})`
            : task.customer
        }
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack", href: "/warehouse/pick-pack" },
          { label: task.reference },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/pick-pack">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Picklist</CardTitle>
            <CardDescription>Suggested bins and picked quantities now come from backend execution records.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Suggested bin</TableHead>
                  <TableHead>Picked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.sku ?? "—"}</TableCell>
                    <TableCell>{line.productName ?? line.productId}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{line.suggestedBin ?? "—"}</TableCell>
                    <TableCell>{line.pickedQty ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cartons count</Label>
                <Input value={cartons} onChange={(e) => setCartons(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Packing note</Label>
                <Input value={packingNote} onChange={(e) => setPackingNote(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dispatch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Courier</Label>
                <Input value={courier} onChange={(e) => setCourier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tracking reference</Label>
                <Input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={async () => {
            await runPickPackAction(task.id, {
              action: "pick",
              lines: task.lines.map((line) => ({
                lineId: line.id,
                pickedQty: line.quantity,
                locationId: line.locationId,
              })),
            });
            toast.success("Pick confirmed.");
            await refresh();
          }}>
            Confirm pick
          </Button>
          <Button variant="secondary" onClick={async () => {
            await runPickPackAction(task.id, {
              action: "pack",
              cartonsCount: Number(cartons) || 0,
              packingNote,
            });
            toast.success("Pack confirmed.");
            await refresh();
          }}>
            Confirm pack
          </Button>
          <Button variant="secondary" onClick={async () => {
            await runPickPackAction(task.id, {
              action: "dispatch",
              courier,
              trackingRef,
            });
            toast.success("Dispatch recorded.");
            await refresh();
          }}>
            Mark dispatched
          </Button>
          <Button variant="outline" onClick={async () => {
            await runPickPackAction(task.id, { action: "complete" });
            toast.success("Task completed.");
            await refresh();
          }}>
            Complete
          </Button>
          {task.sourceDocumentId ? (
            <Button variant="outline" asChild>
              <Link href={`/docs/delivery-note/${task.sourceDocumentId}`}>Open delivery note</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
