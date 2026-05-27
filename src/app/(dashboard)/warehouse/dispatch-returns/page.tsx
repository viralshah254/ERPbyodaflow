"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchPendingWarehouseDrops, type PendingWarehouseDropRow } from "@/lib/api/dispatch-warehouse";

export default function DispatchReturnsPage() {
  const [rows, setRows] = React.useState<PendingWarehouseDropRow[] | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    fetchPendingWarehouseDrops()
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Driver returns"
        description="Dispatch dropped goods awaiting warehouse weigh and stock post."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Driver returns" },
        ]}
      />
      <div className="p-6 space-y-4">
        {rows === undefined && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows?.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending driver returns.</p>
        )}
        {rows?.map((row) => (
          <Card key={row.deliveryNoteId}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{row.number}</p>
                <p className="text-sm text-muted-foreground">
                  {row.partyName ?? "—"} · Driver {row.dispatcherName}
                  {row.tripLabel ? ` · Trip ${row.tripLabel}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dropped {new Date(row.droppedAt).toLocaleString()}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/warehouse/dispatch-returns/${row.deliveryNoteId}`}>Weigh & post</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
