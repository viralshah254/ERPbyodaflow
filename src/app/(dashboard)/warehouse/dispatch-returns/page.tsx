"use client";

import * as React from "react";
import Link from "next/link";
import { CustomerLink } from "@/components/customers/CustomerLink";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import {
  fetchDriverReturnBoard,
  type OpenDriverReturnRow,
  type PendingWarehouseDropRow,
} from "@/lib/api/dispatch-warehouse";
import { toast } from "sonner";

export default function DispatchReturnsPage() {
  const canWrite = useCanWriteInventory();
  const [onRoad, setOnRoad] = React.useState<OpenDriverReturnRow[] | undefined>(undefined);
  const [pending, setPending] = React.useState<PendingWarehouseDropRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    fetchDriverReturnBoard()
      .then((board) => {
        if (cancelled) return;
        setOnRoad(board.onRoad);
        setPending(board.pending);
      })
      .catch((error) => {
        if (cancelled) return;
        setOnRoad([]);
        setPending([]);
        toast.error(error instanceof Error ? error.message : "Could not load driver returns.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Driver returns"
        description="Goods the truck brings back from dispatched delivery notes. Good stock goes on hand. Damaged stock is recorded and stays unsellable."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Driver returns" },
        ]}
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Out with the driver</CardTitle>
            <CardDescription>
              {onRoad === undefined
                ? "Loading…"
                : `${onRoad.length} delivery note${onRoad.length === 1 ? "" : "s"} in transit. Record what came back. Leave a line at 0 when the customer kept it.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {onRoad?.map((row) => (
              <div key={row.deliveryNoteId} className="flex flex-wrap items-center justify-between gap-4 rounded-md border px-4 py-3">
                <div>
                  <p className="font-medium">{row.number}</p>
                  <p className="text-sm text-muted-foreground">
                    <CustomerLink id={row.partyId} name={row.partyName} />
                    {row.tripLabel ? ` · ${row.tripLabel}` : ""}
                    {row.vehicleCode ? ` · ${row.vehicleCode}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.lines.length} line{row.lines.length === 1 ? "" : "s"}
                    {row.dispatchedAt ? ` · left ${new Date(row.dispatchedAt).toLocaleString()}` : ""}
                  </p>
                </div>
                {canWrite ? (
                  <Button asChild size="sm">
                    <Link href={`/warehouse/dispatch-returns/${row.deliveryNoteId}`}>Record return</Link>
                  </Button>
                ) : null}
              </div>
            ))}
            {onRoad?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing is out with a driver.{" "}
                <Link href="/warehouse/dispatch" className="underline underline-offset-2">
                  Dispatch packed notes
                </Link>{" "}
                first. They show up here until the customer keeps them or the truck brings them back.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {pending.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Waiting to post</CardTitle>
              <CardDescription>A drop was logged and still needs the warehouse to confirm the quantity and post stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.map((row) => (
                <div key={row.deliveryNoteId} className="flex flex-wrap items-center justify-between gap-4 rounded-md border px-4 py-3">
                  <div>
                    <p className="font-medium">{row.number}</p>
                    <p className="text-sm text-muted-foreground">
                      <CustomerLink id={row.partyId} name={row.partyName} /> · Driver {row.dispatcherName}
                      {row.tripLabel ? ` · ${row.tripLabel}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Dropped {new Date(row.droppedAt).toLocaleString()}</p>
                  </div>
                  {canWrite ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/warehouse/dispatch-returns/${row.deliveryNoteId}`}>Post to stock</Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
