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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dispatchPickPackOrder, getPickPackOrderById, confirmPickPackPack, confirmPickPackPick } from "@/lib/data/warehouse-execution.repo";
import { warehousePickPackComplete } from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PickPackDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = React.useState(() => getPickPackOrderById(id));
  const [cartons, setCartons] = React.useState(order?.cartonsCount ?? 0);
  const [packingNote, setPackingNote] = React.useState(order?.packingNote ?? "");
  const [courier, setCourier] = React.useState(order?.courier ?? "");
  const [trackingRef, setTrackingRef] = React.useState(order?.trackingRef ?? "");

  const refreshOrder = React.useCallback(() => {
    const next = getPickPackOrderById(id);
    setOrder(next);
    setCartons(next?.cartonsCount ?? 0);
    setPackingNote(next?.packingNote ?? "");
    setCourier(next?.courier ?? "");
    setTrackingRef(next?.trackingRef ?? "");
  }, [id]);

  if (!order) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Pick & Pack", href: "/warehouse/pick-pack" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Order not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/pick-pack">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`${order.reference} — ${order.status}`}
        description={order.customer ? `Customer: ${order.customer}` : undefined}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack", href: "/warehouse/pick-pack" },
          { label: order.reference },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await warehousePickPackComplete(id);
                  refreshOrder();
                  toast.success("Pick-pack completed.");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Complete
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/pick-pack">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="pick" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pick">Picklist</TabsTrigger>
            <TabsTrigger value="pack">Pack</TabsTrigger>
            <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          </TabsList>
          <TabsContent value="pick" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Picklist</CardTitle>
                <CardDescription>Item, qty, suggested bin, and confirmed picked quantity.</CardDescription>
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
                    {order.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.sku}</TableCell>
                        <TableCell>{l.productName}</TableCell>
                        <TableCell>{l.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">{l.suggestedBin ?? "—"}</TableCell>
                        <TableCell>{l.pickedQty ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Button
              onClick={() => {
                confirmPickPackPick(id);
                refreshOrder();
                toast.success("Pick confirmed and moved to packing.");
              }}
            >
              Confirm pick
            </Button>
          </TabsContent>
          <TabsContent value="pack" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pack</CardTitle>
                <CardDescription>Capture packaging units and packing instructions before dispatch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cartons count</Label>
                  <Input type="number" value={cartons} onChange={(e) => setCartons(parseInt(e.target.value, 10) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Packing note</Label>
                  <Input value={packingNote} onChange={(e) => setPackingNote(e.target.value)} placeholder="Optional" />
                </div>
              </CardContent>
            </Card>
            <Button
              onClick={() => {
                confirmPickPackPack(id, cartons, packingNote);
                refreshOrder();
                toast.success("Pack confirmed and moved to dispatch.");
              }}
            >
              Confirm pack
            </Button>
          </TabsContent>
          <TabsContent value="dispatch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dispatch</CardTitle>
                <CardDescription>Record carrier and tracking reference before release.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Courier</Label>
                  <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. DHL, FedEx" />
                </div>
                <div className="space-y-2">
                  <Label>Tracking reference</Label>
                  <Input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} placeholder="Tracking #" />
                </div>
              </CardContent>
            </Card>
            <Button
              onClick={() => {
                dispatchPickPackOrder(id, courier, trackingRef);
                refreshOrder();
                toast.success("Dispatch recorded.");
              }}
            >
              Mark dispatched
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
