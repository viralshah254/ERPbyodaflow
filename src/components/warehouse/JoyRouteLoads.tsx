"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import {
  allocateJoyLoad,
  cancelJoyLoadNote,
  createJoyLoadNote,
  downloadJoyLoadNotePdf,
  fetchJoyLoadNotes,
  recordJoyLoaded,
  type JoyLoadNote,
  type JoyLoadNotes,
  type JoyWaitingRoute,
} from "@/lib/api/joy-dispatch";
import { toast } from "sonner";

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function parseQty(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function gapText(gap: number): string {
  if (Math.abs(gap) < 0.0001) return "Matches the truck.";
  return gap < 0 ? `Take ${roundQty(Math.abs(gap))} off the orders.` : `Put ${roundQty(gap)} back on the orders.`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function WaitingRouteCard({
  route,
  trucks,
  busyTrucks,
  canLoad,
  onCreated,
}: {
  route: JoyWaitingRoute;
  trucks: string[];
  busyTrucks: string[];
  canLoad: boolean;
  onCreated: () => Promise<void>;
}) {
  const [truck, setTruck] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Card id={`route-${route.warehouseId}`}>
      <CardHeader>
        <CardTitle>{route.warehouseName}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {route.orderCount} order{route.orderCount === 1 ? "" : "s"}: {route.orders.map((order) => order.number).join(", ")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">SKU</th>
              <th className="py-1 pr-3">Product</th>
              <th className="py-1 pr-3">Unit</th>
              <th className="py-1 text-right">Total to load</th>
            </tr>
          </thead>
          <tbody>
            {route.products.map((product) => (
              <tr key={product.productId} className="border-t">
                <td className="py-1 pr-3">{product.sku ?? ""}</td>
                <td className={`py-1 pr-3 ${CAPS_ON_PRODUCT_CLASS}`}>{product.name}</td>
                <td className="py-1 pr-3">{product.unit ?? ""}</td>
                <td className="py-1 text-right font-medium">{product.orderedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canLoad ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56 space-y-1">
              <Label>Truck</Label>
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={truck}
                onChange={(event) => setTruck(event.target.value)}
              >
                <option value="">Choose a truck</option>
                {trucks.map((plate) => (
                  <option key={plate} value={plate} disabled={busyTrucks.includes(plate)}>
                    {plate}
                    {busyTrucks.includes(plate) ? " (on another load)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!truck || busy}
              onClick={() => {
                setBusy(true);
                void createJoyLoadNote({ warehouseId: route.warehouseId, truck })
                  .then(async (note) => {
                    toast.success(`Loading note ${note.number} created for ${note.truck}.`);
                    await onCreated();
                  })
                  .catch((error) => toast.error(errorMessage(error, "Could not create the loading note")))
                  .finally(() => setBusy(false));
              }}
            >
              Create loading note
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoadingNoteCard({ note, canLoad, onChanged }: { note: JoyLoadNote; canLoad: boolean; onChanged: () => Promise<void> }) {
  const [loaded, setLoaded] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const rows = note.lines.map((line) => {
    const qty = parseQty(loaded[line.productId], line.orderedQty);
    return { line, qty, short: roundQty(line.orderedQty - qty) };
  });
  const invalid = rows.some((row) => !Number.isFinite(row.qty) || row.qty < 0 || row.qty > row.line.orderedQty);
  const full = !invalid && rows.every((row) => Math.abs(row.short) < 0.0001);
  return (
    <Card id={`note-${note.id}`}>
      <CardHeader>
        <CardTitle>
          {note.number} · {note.truck}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {note.routeWarehouseName} · loaded from {note.fulfilmentWarehouseName} · {note.salesOrderIds.length} order
          {note.salesOrderIds.length === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={() => void downloadJoyLoadNotePdf(note, (message) => toast.error(message))}>
          Print loading note
        </Button>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">SKU</th>
              <th className="py-1 pr-3">Product</th>
              <th className="py-1 pr-3 text-right">Total</th>
              <th className="py-1 pr-3">Loaded</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, short }) => (
              <tr key={line.productId} className={`border-t ${Math.abs(short) > 0.0001 ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                <td className="py-1 pr-3">{line.sku ?? ""}</td>
                <td className={`py-1 pr-3 ${CAPS_ON_PRODUCT_CLASS}`}>{line.name}</td>
                <td className="py-1 pr-3 text-right">{line.orderedQty}</td>
                <td className="py-1 pr-3">
                  <Input
                    className="h-8 w-24"
                    inputMode="decimal"
                    disabled={!canLoad}
                    value={loaded[line.productId] ?? String(line.orderedQty)}
                    onChange={(event) => setLoaded((current) => ({ ...current, [line.productId]: event.target.value }))}
                  />
                </td>
                <td className="py-1 text-xs text-muted-foreground">{short > 0.0001 ? `Short ${short}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canLoad ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={invalid || busy}
              onClick={() => {
                setBusy(true);
                void recordJoyLoaded(
                  note.id,
                  rows.map((row) => ({ productId: row.line.productId, loadedQty: row.qty }))
                )
                  .then(async (result) => {
                    toast.success(
                      result.status === "INVOICED"
                        ? `${note.number} loaded in full. Invoices and delivery notes are created.`
                        : `${note.number} is short. Finance will choose which orders to reduce.`
                    );
                    await onChanged();
                  })
                  .catch(async (error) => {
                    toast.error(errorMessage(error, "Could not record the load"));
                    await onChanged();
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {full ? "Confirm full load and invoice" : "Send short load to finance"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void cancelJoyLoadNote(note.id)
                  .then(async () => {
                    toast.success(`${note.number} cancelled. Its orders are waiting again.`);
                    await onChanged();
                  })
                  .catch((error) => toast.error(errorMessage(error, "Could not cancel")))
                  .finally(() => setBusy(false));
              }}
            >
              Cancel loading note
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The warehouse records what was loaded.</p>
        )}
      </CardContent>
    </Card>
  );
}

function FinanceNoteCard({ note, canFinance, onChanged }: { note: JoyLoadNote; canFinance: boolean; onChanged: () => Promise<void> }) {
  const [qty, setQty] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const invoiced = new Set(note.results.filter((row) => row.invoiceId).map((row) => row.salesOrderId));
  const lines = note.lines.map((line) => {
    const loaded = Number(line.loadedQty ?? 0);
    const short = Math.abs(loaded - line.orderedQty) > 0.0001;
    const allocations = line.allocations.map((row) => {
      const key = `${row.salesOrderId}:${row.lineId}`;
      const value = short ? parseQty(qty[key], row.invoiceQty) : row.invoiceQty;
      return { row, key, value };
    });
    const assigned = roundQty(allocations.reduce((sum, a) => sum + (Number.isFinite(a.value) ? a.value : 0), 0));
    const invalid = allocations.some((a) => !Number.isFinite(a.value) || a.value < 0 || a.value > a.row.orderedQty);
    return { line, loaded, short, allocations, gap: roundQty(loaded - assigned), invalid };
  });
  const ready = lines.every((line) => !line.invalid && Math.abs(line.gap) < 0.0001);
  const shortLines = lines.filter((line) => line.short);
  return (
    <Card id={`note-${note.id}`}>
      <CardHeader>
        <CardTitle>
          {note.number} · {note.truck}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {note.routeWarehouseName} · {note.status === "INVOICING" ? "invoicing now" : "short load, waiting for finance"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {note.lastError ? <p className="text-sm text-destructive">Last attempt failed: {note.lastError}</p> : null}
        {lines.some((line) => !line.short) ? (
          <p className="text-sm text-muted-foreground">
            Loaded in full: {lines.filter((line) => !line.short).map((line) => line.line.name).join(", ")}
          </p>
        ) : null}
        {shortLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is short. Create the invoices to finish this load.</p>
        ) : null}
        {shortLines.map(({ line, loaded, allocations, gap }) => (
          <div
            key={line.productId}
            className={`space-y-2 rounded-md border p-3 ${Math.abs(gap) > 0.0001 ? "border-amber-500" : ""}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={`text-sm font-medium ${CAPS_ON_PRODUCT_CLASS}`}>{line.name}</p>
              <p className="text-sm">
                Ordered {line.orderedQty} · loaded {loaded} · {gapText(gap)}
              </p>
            </div>
            {allocations.map(({ row, key }) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {row.salesOrderNumber} · {row.customerName}
                  {row.branchName ? ` · ${row.branchName}` : ""}
                  <span className="text-muted-foreground"> · ordered {row.orderedQty}</span>
                </span>
                <Input
                  className="h-8 w-24"
                  inputMode="decimal"
                  disabled={!canFinance || invoiced.has(row.salesOrderId)}
                  value={qty[key] ?? String(row.invoiceQty)}
                  onChange={(event) => setQty((current) => ({ ...current, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        ))}
        {canFinance ? (
          <Button
            disabled={!ready || busy || note.status !== "AWAITING_FINANCE"}
            onClick={() => {
              setBusy(true);
              void allocateJoyLoad(
                note.id,
                lines.flatMap((line) =>
                  line.allocations.map((a) => ({ salesOrderId: a.row.salesOrderId, lineId: a.row.lineId, quantity: a.value }))
                )
              )
                .then(async () => {
                  toast.success(`${note.number} invoiced. Delivery notes are created.`);
                  await onChanged();
                })
                .catch(async (error) => {
                  toast.error(errorMessage(error, "Could not invoice this load"));
                  await onChanged();
                })
                .finally(() => setBusy(false));
            }}
          >
            Create invoices and delivery notes
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Finance chooses which orders to reduce.</p>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicedNoteCard({ note }: { note: JoyLoadNote }) {
  return (
    <Card id={`note-${note.id}`}>
      <CardHeader>
        <CardTitle>
          {note.number} · {note.truck}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{note.routeWarehouseName}</p>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {note.results.map((row) => (
          <div key={row.salesOrderId} className="flex flex-wrap gap-3">
            {row.invoiceId ? (
              <Link className="text-primary" href={`/docs/invoice/${row.invoiceId}`}>
                {row.invoiceNumber}
              </Link>
            ) : null}
            {row.deliveryNoteId ? (
              <Link className="text-primary" href={`/docs/delivery-note/${row.deliveryNoteId}`}>
                {row.deliveryNoteNumber}
              </Link>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children.length ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}

function JoyRouteLoadsInner() {
  const params = useSearchParams();
  const focusWarehouse = params.get("warehouse") ?? "";
  const focusNote = params.get("note") ?? "";
  const canLoad = useHasPermission("inventory.write");
  const canFinance = useHasPermission("finance.write");
  const [data, setData] = React.useState<JoyLoadNotes | null>(null);

  const reload = React.useCallback(async () => {
    try {
      setData(await fetchJoyLoadNotes());
    } catch (error) {
      toast.error(errorMessage(error, "Could not load the routes"));
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!data) return;
    const note = focusNote
      ? data.notes.find((row) => row.id === focusNote)
      : data.notes.find((row) => row.routeWarehouseId === focusWarehouse && row.status !== "INVOICED");
    const target = note ? `note-${note.id}` : focusWarehouse ? `route-${focusWarehouse}` : "";
    if (target) document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [data, focusNote, focusWarehouse]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading routes…</p>;

  const loading = data.notes.filter((note) => note.status === "OPEN");
  const finance = data.notes.filter((note) => note.status === "AWAITING_FINANCE" || note.status === "INVOICING");
  const invoiced = data.notes.filter((note) => note.status === "INVOICED");

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Goods are picked from {data.dispatchWarehouseName}. Each delivery warehouse goes on one truck.
      </p>
      <Section title="Waiting for a truck" empty="No approved orders are waiting for a truck.">
        {data.waiting.map((route) => (
          <WaitingRouteCard
            key={route.warehouseId}
            route={route}
            trucks={data.trucks}
            busyTrucks={data.busyTrucks}
            canLoad={canLoad}
            onCreated={reload}
          />
        ))}
      </Section>
      <Section title="Loading" empty="No truck is being loaded.">
        {loading.map((note) => (
          <LoadingNoteCard key={note.id} note={note} canLoad={canLoad} onChanged={reload} />
        ))}
      </Section>
      <Section title="Short loads for finance" empty="No short loads are waiting.">
        {finance.map((note) => (
          <FinanceNoteCard key={`${note.id}:${note.status}`} note={note} canFinance={canFinance} onChanged={reload} />
        ))}
      </Section>
      <Section title="Invoiced this week" empty="Nothing invoiced in the last 7 days.">
        {invoiced.map((note) => (
          <InvoicedNoteCard key={note.id} note={note} />
        ))}
      </Section>
    </div>
  );
}

export function JoyRouteLoads() {
  return (
    <React.Suspense fallback={<p className="text-sm text-muted-foreground">Loading routes…</p>}>
      <JoyRouteLoadsInner />
    </React.Suspense>
  );
}
