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
  markJoyLoadDeparted,
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

/** Older notes saved "C4 FRIDAY - C4 FRIDAY" when a warehouse code equals its name. */
function placeLabel(label: string): string {
  const [code, ...rest] = label.split(" - ");
  const name = rest.join(" - ");
  return name && code.trim().toUpperCase() === name.trim().toUpperCase() ? name.trim() : label;
}

const QTY_INPUT = "h-8 w-24 border-muted-foreground/40 text-right tabular-nums";

type BoardStep = "all" | "load" | "finance" | "leave";

function WaitingRouteCard({
  route,
  trucks,
  busyTrucks,
  canLoad,
  dispatchName,
  onCreated,
}: {
  route: JoyWaitingRoute;
  trucks: string[];
  busyTrucks: string[];
  canLoad: boolean;
  dispatchName: string;
  onCreated: () => Promise<void>;
}) {
  const [truck, setTruck] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Card id={`route-${route.warehouseId}`}>
      <CardHeader className="space-y-1">
        <CardTitle>{placeLabel(route.warehouseName)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {route.orderCount} order{route.orderCount === 1 ? "" : "s"} · picked from {placeLabel(dispatchName)}
        </p>
        <p className="text-xs text-muted-foreground">{route.orders.map((order) => order.number).join(", ")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">SKU</th>
              <th className="py-1 pr-3">Product</th>
              <th className="py-1 pr-3 text-right">Ordered</th>
            </tr>
          </thead>
          <tbody>
            {route.products.map((product) => (
              <tr key={product.productId} className="border-t">
                <td className="py-1 pr-3">{product.sku ?? ""}</td>
                <td className={`py-1 pr-3 ${CAPS_ON_PRODUCT_CLASS}`}>{product.name}</td>
                <td className="py-1 text-right font-medium tabular-nums">{product.orderedQty}</td>
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
        ) : (
          <p className="text-sm text-muted-foreground">Warehouse staff choose the truck and create the note.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingNoteCard({
  note,
  canLoad,
  dispatchName,
  onChanged,
}: {
  note: JoyLoadNote;
  canLoad: boolean;
  dispatchName: string;
  onChanged: () => Promise<void>;
}) {
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
      <CardHeader className="space-y-1">
        <CardTitle>
          {note.number} · {note.truck}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {placeLabel(note.routeWarehouseName)} · picked from {placeLabel(dispatchName || note.fulfilmentWarehouseName)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => void downloadJoyLoadNotePdf(note, (message) => toast.error(message))}>
          Print loading note
        </Button>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">SKU</th>
              <th className="py-1 pr-3">Product</th>
              <th className="py-1 pr-3 text-right">Ordered</th>
              <th className="py-1 pr-3 text-right">Loaded</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, short }) => (
              <tr key={line.productId} className={`border-t ${Math.abs(short) > 0.0001 ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                <td className="py-1 pr-3">{line.sku ?? ""}</td>
                <td className={`py-1 pr-3 ${CAPS_ON_PRODUCT_CLASS}`}>{line.name}</td>
                <td className="py-1 pr-3 text-right tabular-nums">{line.orderedQty}</td>
                <td className="py-1 pr-3">
                  <div className="flex justify-end">
                    <Input
                      className={QTY_INPUT}
                      inputMode="decimal"
                      disabled={!canLoad}
                      value={loaded[line.productId] ?? String(line.orderedQty)}
                      onChange={(event) => setLoaded((current) => ({ ...current, [line.productId]: event.target.value }))}
                    />
                  </div>
                </td>
                <td className="py-1 text-xs text-amber-700 dark:text-amber-400">{short > 0.0001 ? `Short ${short}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canLoad ? (
          <div className="flex flex-wrap items-center gap-3">
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
                        ? `${note.number} loaded in full. Invoices are ready.`
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
              {full ? "Confirm load" : "Confirm short load"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
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
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The warehouse records what went on the truck.</p>
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
  const fullLines = lines.filter((line) => !line.short);
  const mappingIssues = note.mappingIssues ?? [];
  const mappingError = /UOM Mapping Required/i.test(note.lastError ?? "");
  const showPreviousError = note.lastError && (!mappingError || note.mappingIssues === undefined);
  const allocationChanged = lines.some(({ allocations }) =>
    allocations.some(({ row, value }) => Math.abs(row.invoiceQty - value) >= 0.0001)
  );
  const canSubmit = ready && (!mappingIssues.length || allocationChanged);
  const completed = note.results.filter((row) => row.stockIssued).length;
  return (
    <Card id={`note-${note.id}`}>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{note.number} · {note.truck}</CardTitle>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${mappingIssues.length
            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
            : "bg-muted text-muted-foreground"}`}>
            {mappingIssues.length ? "Mapping needed" : shortLines.length ? "Finance review" : "Ready to retry"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{placeLabel(note.routeWarehouseName)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {mappingIssues.length ? (
          <section aria-label="SKU mapping issues" className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{mappingIssues.length} SKU mapping{mappingIssues.length === 1 ? "" : "s"} needed</p>
                <p className="text-sm text-muted-foreground">Verify the sales unit against the SKU’s stock unit, then recheck this load.</p>
              </div>
              <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
                setBusy(true);
                try { await onChanged(); }
                finally { setBusy(false); }
              }}>Recheck mappings</Button>
            </div>
            <ul className="divide-y divide-border">
              {mappingIssues.map((issue) => (
                <li key={`${issue.productId}:${issue.unit}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {issue.productSku ? `${issue.productSku} · ` : ""}{issue.productName || issue.description || issue.productId}
                    </p>
                    <p className="flex flex-wrap gap-x-2 text-muted-foreground">
                      <span>Sales unit <strong className="text-foreground">{issue.unit}</strong></span>
                      {issue.orders.map((order) => (
                        <Link key={order.id} className="text-primary underline underline-offset-2" href={`/docs/sales-order/${encodeURIComponent(order.id)}`}>{order.number}</Link>
                      ))}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/master/products/${encodeURIComponent(issue.productId)}?tab=packaging`} target="_blank" rel="noopener noreferrer">Open SKU units</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {showPreviousError ? (
          <div role="status" className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {note.lastError}
          </div>
        ) : null}
        {completed > 0 && <p className="text-sm text-muted-foreground">{completed} order{completed === 1 ? "" : "s"} already invoiced and issued.</p>}
        {fullLines.length ? (
          <details className="rounded-lg border px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">Loaded in full · {fullLines.length} SKU{fullLines.length === 1 ? "" : "s"}</summary>
            <ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
              {fullLines.map(({ line, loaded }) => (
                <li key={line.productId} className="flex justify-between gap-2">
                  <span>{line.name}</span><span className="shrink-0 tabular-nums">{loaded} {line.unit}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {shortLines.map(({ line, loaded, allocations, gap, invalid }) => {
          const matched = !invalid && Math.abs(gap) < 0.0001;
          return (
            <div key={line.productId} className="overflow-hidden rounded-md border">
              <div className="flex flex-wrap items-baseline justify-between gap-2 bg-muted/50 px-3 py-2">
                <p className={`text-sm font-medium ${CAPS_ON_PRODUCT_CLASS}`}>
                  {line.sku ? `${line.sku} · ` : ""}
                  {line.name}
                </p>
                <p className="text-sm tabular-nums">
                  Ordered {line.orderedQty} · loaded <span className="font-semibold">{loaded} {line.unit}</span>
                </p>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[26rem] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-normal">Order</th>
                    <th className="px-3 py-1.5 font-normal">Customer</th>
                    <th className="px-3 py-1.5 text-right font-normal">Ordered</th>
                    <th className="px-3 py-1.5 text-right font-normal">To invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(({ row, key }) => (
                    <tr key={key} className="border-t">
                      <td className="px-3 py-1.5">
                        <Link className="text-primary hover:underline" href={`/docs/sales-order/${row.salesOrderId}`}>
                          {row.salesOrderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5">
                        {row.customerName}
                        {row.branchName ? <span className="text-muted-foreground"> · {row.branchName}</span> : null}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{row.orderedQty}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex justify-end">
                          <Input
                            className={QTY_INPUT}
                            inputMode="decimal"
                            aria-label={`Invoice quantity for ${row.salesOrderNumber}`}
                            disabled={busy || !canFinance || invoiced.has(row.salesOrderId)}
                            value={qty[key] ?? String(row.invoiceQty)}
                            onChange={(event) => setQty((current) => ({ ...current, [key]: event.target.value }))}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <p
                className={`border-t px-3 py-2 text-sm font-medium ${
                  matched ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {invalid ? "Enter a quantity between zero and the ordered amount for each order." : gapText(gap)}
              </p>
            </div>
          );
        })}
        {canFinance ? (
          <Button
            disabled={!canSubmit || busy || note.status !== "AWAITING_FINANCE"}
            onClick={() => {
              setBusy(true);
              void allocateJoyLoad(
                note.id,
                lines.flatMap((line) =>
                  line.allocations.map((a) => ({ salesOrderId: a.row.salesOrderId, lineId: a.row.lineId, quantity: a.value }))
                )
              )
                .then(async () => {
                  toast.success(`${note.number} invoiced. Ready for the truck to leave.`);
                  await onChanged();
                })
                .catch(async (error) => {
                  toast.error(errorMessage(error, "Could not create the invoices"));
                  await onChanged();
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Working…" : note.results.some((row) => row.invoiceId) ? "Resume invoicing" : "Create invoices"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Finance chooses which orders to reduce, then creates the invoices.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ReadyToLeaveCard({ note, canLoad, onChanged }: { note: JoyLoadNote; canLoad: boolean; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Card id={`note-${note.id}`}>
      <CardHeader className="space-y-1">
        <CardTitle>
          {note.number} · {note.truck}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {placeLabel(note.routeWarehouseName)} · ready to leave
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          {note.results.map((row) => (
            <div key={row.salesOrderId} className="flex flex-wrap gap-3">
              {row.invoiceId ? (
                <Link className="text-primary hover:underline" href={`/docs/invoice/${row.invoiceId}`}>
                  {row.invoiceNumber}
                </Link>
              ) : null}
              {row.deliveryNoteId ? (
                <Link className="text-primary hover:underline" href={`/docs/delivery-note/${row.deliveryNoteId}`}>
                  {row.deliveryNoteNumber}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Sales orders keep the ordered quantities. Invoices show what was loaded.
        </p>
        {canLoad ? (
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void markJoyLoadDeparted(note.id)
                .then(async () => {
                  toast.success(`${note.truck} marked as left.`);
                  await onChanged();
                })
                .catch((error) => toast.error(errorMessage(error, "Could not mark the truck as left")))
                .finally(() => setBusy(false));
            }}
          >
            Truck left
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Warehouse marks when the truck leaves.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LeftTodayCard({ note }: { note: JoyLoadNote }) {
  return (
    <Card id={`note-${note.id}`}>
      <CardHeader className="space-y-1 py-4">
        <CardTitle className="text-base">
          {note.number} · {note.truck}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{placeLabel(note.routeWarehouseName)} · left today</p>
      </CardHeader>
      <CardContent className="space-y-1 pb-4 text-sm">
        {note.results.map((row) => (
          <div key={row.salesOrderId} className="flex flex-wrap gap-3">
            {row.invoiceId ? (
              <Link className="text-primary hover:underline" href={`/docs/invoice/${row.invoiceId}`}>
                {row.invoiceNumber}
              </Link>
            ) : null}
            {row.deliveryNoteId ? (
              <Link className="text-primary hover:underline" href={`/docs/delivery-note/${row.deliveryNoteId}`}>
                {row.deliveryNoteNumber}
              </Link>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Section({
  id,
  title,
  empty,
  children,
}: {
  id: string;
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  if (!children.length) {
    return (
      <section id={id} className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </section>
    );
  }
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function JoyRouteLoadsInner() {
  const params = useSearchParams();
  const focusWarehouse = params.get("warehouse") ?? "";
  const focusNote = params.get("note") ?? "";
  const step = (params.get("step") as BoardStep | null) ?? "all";
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
    const target = note
      ? `note-${note.id}`
      : focusWarehouse
        ? `route-${focusWarehouse}`
        : step === "load"
          ? "step-load"
          : step === "finance"
            ? "step-finance"
            : step === "leave"
              ? "step-leave"
              : "";
    if (target) document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [data, focusNote, focusWarehouse, step]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading routes…</p>;

  const loading = data.notes.filter((note) => note.status === "OPEN");
  const finance = data.notes.filter((note) => note.status === "AWAITING_FINANCE" || note.status === "INVOICING");
  const ready = data.notes.filter((note) => note.status === "INVOICED" && !note.departedAt);
  const left = data.notes.filter((note) => note.status === "INVOICED" && note.departedAt);
  const showLoad = step === "all" || step === "load";
  const showFinance = step === "all" || step === "finance";
  const showLeave = step === "all" || step === "leave";
  const hideEmpty = step === "all";

  const loadBlocks =
    showLoad && (!hideEmpty || data.waiting.length || loading.length)
      ? [
          <Section key="waiting" id="step-load" title="1. Choose a truck" empty="No approved orders are waiting for a truck.">
            {data.waiting.map((route) => (
              <WaitingRouteCard
                key={route.warehouseId}
                route={route}
                trucks={data.trucks}
                busyTrucks={data.busyTrucks}
                canLoad={canLoad}
                dispatchName={data.dispatchWarehouseName}
                onCreated={reload}
              />
            ))}
          </Section>,
          <Section key="loading" id="step-loading" title="2. Confirm load" empty="No truck is being loaded.">
            {loading.map((note) => (
              <LoadingNoteCard
                key={note.id}
                note={note}
                canLoad={canLoad}
                dispatchName={data.dispatchWarehouseName}
                onChanged={reload}
              />
            ))}
          </Section>,
        ]
      : [];
  const financeBlock =
    showFinance && (!hideEmpty || finance.length)
      ? [
          <Section key="finance" id="step-finance" title="3. Finance review" empty="No loads need finance review.">
            {finance.map((note) => (
              <FinanceNoteCard key={`${note.id}:${note.status}`} note={note} canFinance={canFinance} onChanged={reload} />
            ))}
          </Section>,
        ]
      : [];
  const leaveBlocks =
    showLeave && (!hideEmpty || ready.length || left.length)
      ? [
          <Section key="ready" id="step-leave" title="4. Ready to leave" empty="No invoiced loads are waiting to leave.">
            {ready.map((note) => (
              <ReadyToLeaveCard key={note.id} note={note} canLoad={canLoad} onChanged={reload} />
            ))}
          </Section>,
          <Section key="left" id="step-left" title="5. Left today" empty="No trucks have left yet today.">
            {left.map((note) => (
              <LeftTodayCard key={note.id} note={note} />
            ))}
          </Section>,
        ]
      : [];

  // Put the section with outstanding work first so the next action is obvious.
  const sections =
    finance.length && step === "all"
      ? [...financeBlock, ...loadBlocks, ...leaveBlocks]
      : ready.length && !loading.length && !data.waiting.length && step === "all"
        ? [...leaveBlocks, ...loadBlocks, ...financeBlock]
        : [...loadBlocks, ...financeBlock, ...leaveBlocks];

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Sales orders keep what was ordered. The loading note records what went on the truck. Invoices bill the loaded
        quantity. Goods are picked from {placeLabel(data.dispatchWarehouseName)}.
      </p>
      {sections.length ? sections : <p className="text-sm text-muted-foreground">Nothing needs attention on this step.</p>}
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
