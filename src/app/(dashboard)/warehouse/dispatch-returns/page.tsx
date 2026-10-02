"use client";

import * as React from "react";
import Link from "next/link";
import { CustomerLink } from "@/components/customers/CustomerLink";
import { LIST_PAGE_BODY_PAGINATED_CLASS, LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import {
  fetchDriverReturnPage,
  type OpenDriverReturnRow,
  type PendingWarehouseDropRow,
} from "@/lib/api/dispatch-warehouse";
import { fetchDistributionVehicles, type DistributionVehicleRow } from "@/lib/api/logistics";
import { toast } from "sonner";

const RETURN_PAGE_SIZES = [20, 25, 30, 50];

function formatLeftAt(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const time = date.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  const start = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const today = start(new Date());
  const day = start(date);
  if (day === today) return `Today, ${time}`;
  if (day === today - 86_400_000) return `Yesterday, ${time}`;
  const when = date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
  return `${when}, ${time}`;
}

export default function DispatchReturnsPage() {
  const canWrite = useCanWriteInventory();
  const [onRoad, setOnRoad] = React.useState<OpenDriverReturnRow[]>([]);
  const [pending, setPending] = React.useState<PendingWarehouseDropRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [date, setDate] = React.useState("");
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const [pageSizeOptions, setPageSizeOptions] = React.useState<number[]>(RETURN_PAGE_SIZES);
  const [totalCount, setTotalCount] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [vehicles, setVehicles] = React.useState<DistributionVehicleRow[]>([]);

  React.useEffect(() => {
    void fetchDistributionVehicles({ active: true })
      .then(setVehicles)
      .catch(() => {
        /* The code still shows if the fleet list cannot be loaded. */
      });
  }, []);

  const fleetByCode = React.useMemo(() => {
    const byCode = new Map<string, DistributionVehicleRow>();
    for (const vehicle of vehicles) {
      if (vehicle.code) byCode.set(vehicle.code, vehicle);
    }
    return byCode;
  }, [vehicles]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((current) => {
        if (current === next) return current;
        setPageOffset(0);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDriverReturnPage({ search, date, limit: pageSize, offset: pageOffset })
      .then((page) => {
        if (cancelled) return;
        setOnRoad(page.items);
        setPending(page.pending);
        setTotalCount(page.totalCount);
        setHasMore(page.hasMore);
        if (page.pageSizeOptions.length) setPageSizeOptions(page.pageSizeOptions);
      })
      .catch((error) => {
        if (cancelled) return;
        setOnRoad([]);
        setPending([]);
        setTotalCount(0);
        setHasMore(false);
        toast.error(error instanceof Error ? error.message : "Could not load driver returns.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, date, pageOffset, pageSize]);

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Driver returns"
        description="Goods the truck brings back from dispatched delivery notes. Good stock goes on hand. Damaged stock is recorded and stays unsellable."
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Driver returns" },
        ]}
        sticky
      />
      <div className={`${LIST_PAGE_BODY_PAGINATED_CLASS} gap-6 pb-16`}>
        <Card>
          <CardHeader>
            <CardTitle>Out with the driver</CardTitle>
            <CardDescription>Record what came back. Leave a line at 0 when the customer kept it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="flex flex-col gap-2 px-6 pt-4 sm:flex-row">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search customer, delivery note, or vehicle"
                aria-label="Search driver returns"
                className="sm:max-w-md"
              />
              <Input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPageOffset(0);
                }}
                aria-label="Date the load left"
                className="sm:w-44"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead>Left</TableHead>
                  {canWrite ? <TableHead className="w-36" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {onRoad.map((row) => {
                  const fleet = row.vehicleCode ? fleetByCode.get(row.vehicleCode) : undefined;
                  const vehicleName = row.vehicleName || fleet?.name;
                  const vehiclePlate = row.vehicleRegistration || fleet?.registration;
                  return (
                  <TableRow key={row.deliveryNoteId}>
                    <TableCell>
                      <Link
                        href={`/docs/delivery-note/${row.deliveryNoteId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <CustomerLink id={row.partyId} name={row.partyName} />
                    </TableCell>
                    <TableCell>{row.tripLabel || "—"}</TableCell>
                    <TableCell>
                      <div>{vehicleName || row.vehicleCode || "—"}</div>
                      {vehiclePlate ? <div className="text-xs text-muted-foreground">{vehiclePlate}</div> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.lines.length}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatLeftAt(row.dispatchedAt)}</TableCell>
                    {canWrite ? (
                      <TableCell>
                        <Button asChild size="sm">
                          <Link href={`/warehouse/dispatch-returns/${row.deliveryNoteId}`}>Record return</Link>
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                  );
                })}
                {!loading && !onRoad.length ? (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                      {search || date ? (
                        "No notes match that search or date."
                      ) : (
                        <>
                          Nothing is out with a driver.{" "}
                          <Link href="/warehouse/dispatch" className="underline underline-offset-2">
                            Dispatch packed notes
                          </Link>{" "}
                          first.
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="px-4 pb-4">
              <TablePagination
                pageOffset={pageOffset}
                pageSize={pageSize}
                itemCount={onRoad.length}
                hasMore={hasMore}
                totalCount={totalCount}
                loading={loading && onRoad.length === 0}
                busy={loading && onRoad.length > 0}
                onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
                onNext={() => setPageOffset((offset) => offset + pageSize)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageOffset(0);
                }}
                pageSizeOptions={pageSizeOptions}
                entityLabel="delivery notes"
              />
            </div>
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
