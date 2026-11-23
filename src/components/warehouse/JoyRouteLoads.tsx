"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import {
  allocateJoyLoad,
  cancelJoyLoadNote,
  createJoyDeliveryNotes,
  createJoyLoadNote,
  printJoyLoadNotePdf,
  fetchJoyLoadNotes,
  generateJoyInvoices,
  markJoyLoadDeparted,
  recordJoyLoaded,
  setJoyLoadSalesReps,
  setJoyRouteSourceStore,
  type JoyLoadDocumentPlan,
  type JoyLoadNote,
  type JoyLoadNotes,
  type JoyWaitingRoute,
} from "@/lib/api/joy-dispatch";
import { ChevronRight, ClipboardList, MapPin, Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { SfaSalesRepsField, type PickedSalesRep } from "@/components/sales/SfaSalesRepPicker";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";

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

function lockedDocumentPlan(note: JoyLoadNote): JoyLoadDocumentPlan | null {
  if (note.results.some((row) => row.invoiceId)) return "both";
  if (note.documentPlan === "delivery_note" && note.results.some((row) => row.deliveryNoteId)) return "delivery_note";
  return null;
}

/** Same place a new invoice or delivery note opens: the document, or the list when a load made several. */
function createdDocumentsHref(plan: JoyLoadDocumentPlan, note: JoyLoadNote): string | null {
  const type = plan === "delivery_note" ? "delivery-note" : "invoice";
  const ids = [...new Set(
    note.results
      .map((row) => (plan === "delivery_note" ? row.deliveryNoteId : row.invoiceId))
      .filter((id): id is string => Boolean(id))
  )];
  if (ids.length === 1) return `/docs/${type}/${encodeURIComponent(ids[0])}`;
  if (ids.length > 1) return `/docs/${type}?ids=${ids.join(",")}`;
  return null;
}

function LoadDocumentActions({
  busyPlan,
  disabled,
  locked,
  resumeDeliveryNote,
  resumeInvoice,
  onChoose,
}: {
  busyPlan: JoyLoadDocumentPlan | null;
  disabled?: boolean;
  locked: JoyLoadDocumentPlan | null;
  resumeDeliveryNote?: boolean;
  resumeInvoice?: boolean;
  onChoose: (plan: JoyLoadDocumentPlan) => void;
}) {
  const showNote = locked == null || locked === "delivery_note";
  const showInvoice = locked == null || locked === "both";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {showNote ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto whitespace-normal"
            disabled={disabled || busyPlan != null}
            onClick={() => onChoose("delivery_note")}
          >
            {busyPlan === "delivery_note" ? "Working…" : resumeDeliveryNote ? "Continue delivery note" : "Delivery note only"}
          </Button>
        ) : null}
        {showInvoice ? (
          <Button
            type="button"
            className="h-auto whitespace-normal"
            disabled={disabled || busyPlan != null}
            onClick={() => onChoose("both")}
          >
            {busyPlan === "both" ? "Working…" : resumeInvoice ? "Continue invoice and delivery note" : "Invoice and delivery note"}
          </Button>
        ) : null}
      </div>
      {locked ? (
        <p className="max-w-xl text-sm text-muted-foreground">
          {locked === "delivery_note"
            ? "The delivery note is ready. Open it when you want the invoice."
            : "This load already started. Continue finishes the invoice and the delivery note."}
        </p>
      ) : null}
    </div>
  );
}

function resetShellScroll() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.getElementById("app-root")?.scrollTo(0, 0);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Older notes saved "C4 FRIDAY - C4 FRIDAY" when a warehouse code equals its name. */
export function loaderNotePath(id: string): string {
  return `/warehouse/route-pick-lists/${encodeURIComponent(id)}`;
}

function truckStage(note: JoyLoadNote): string {
  if (note.departedAt) return "Left";
  if (note.status === "OPEN") return "Confirm load";
  if (note.status === "AWAITING_FINANCE" || note.status === "INVOICING") return "Finance review";
  if (note.status === "CONFIRMED") return "Delivery notes";
  if (note.status === "INVOICED") return "Ready to leave";
  return note.status;
}

function placeLabel(label: string): string {
  const [code, ...rest] = label.split(" - ");
  const name = rest.join(" - ");
  return name && code.trim().toUpperCase() === name.trim().toUpperCase() ? name.trim() : label;
}

const QTY_INPUT = "h-8 w-24 border-muted-foreground/40 text-right tabular-nums";

function formatWhen(value?: string): string {
  if (!value) return "";
  const when = new Date(value);
  if (!Number.isFinite(when.getTime())) return "";
  return when.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function formatWhenParts(value?: string): { date: string; time: string; compact: string } | null {
  if (!value) return null;
  const when = new Date(value);
  if (!Number.isFinite(when.getTime())) return null;
  const date = when.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const time = when.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  const day = when.toLocaleString(undefined, { day: "numeric", month: "short" });
  return { date, time, compact: `${day} · ${time}` };
}

type LoadMilestone = {
  key: string;
  label: string;
  at?: string;
  icon: typeof ClipboardList;
};

function loadMilestones(note: JoyLoadNote): LoadMilestone[] {
  return [
    { key: "created", label: "Created", at: note.createdAt || note.date, icon: ClipboardList },
    { key: "loaded", label: "Loaded", at: note.loadedAt, icon: Package },
    { key: "departed", label: "Left yard", at: note.departedAt, icon: Truck },
  ].filter((step): step is LoadMilestone & { at: string } => Boolean(step.at));
}

function LoadNoteHeader({
  note,
  status,
  routeHint,
  titleClassName,
  headerClassName,
}: {
  note: JoyLoadNote;
  status?: React.ReactNode;
  routeHint?: string;
  titleClassName?: string;
  headerClassName?: string;
}) {
  const milestones = loadMilestones(note);
  return (
    <CardHeader className={headerClassName ?? "space-y-2"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CardTitle className={titleClassName}>{note.number}</CardTitle>
          <span className="rounded-md border border-border/80 bg-muted/25 px-2 py-0.5 font-mono text-sm font-medium tracking-wide">
            {note.truck}
          </span>
        </div>
        {status}
      </div>
      <div
        className="flex items-stretch overflow-x-auto rounded-md border border-border/80 bg-muted/10 text-xs"
        aria-label={milestones.length ? "Load route and timeline" : "Load route"}
      >
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/60 px-2.5 py-1.5 font-medium">
          <MapPin className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          <span>{placeLabel(note.routeWarehouseName)}</span>
          {routeHint ? (
            <span className="hidden font-normal text-muted-foreground sm:inline">
              <span className="px-1" aria-hidden>·</span>
              {routeHint}
            </span>
          ) : null}
        </div>
        {milestones.length ? (
          <ol className="flex min-w-0 flex-1 items-stretch">
            {milestones.map((step, index) => {
              const parts = formatWhenParts(step.at);
              const Icon = step.icon;
              const current = index === milestones.length - 1;
              return (
                <li
                  key={step.key}
                  className={`flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 ${
                    index > 0 ? "border-l border-border/60" : ""
                  } ${current ? "bg-primary/10 text-foreground" : "text-muted-foreground"}`}
                >
                  <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
                  <span className="shrink-0 font-medium uppercase tracking-wide">{step.label}</span>
                  {parts ? <span className="tabular-nums text-foreground/90">{parts.compact}</span> : null}
                </li>
              );
            })}
          </ol>
        ) : routeHint ? (
          <span className="px-2.5 py-1.5 text-muted-foreground sm:hidden">{routeHint}</span>
        ) : null}
      </div>
    </CardHeader>
  );
}

type LoadOrder = {
  id: string;
  number: string;
  customer: string;
  branch?: string;
  when?: string;
};

function ordersOnNote(note: JoyLoadNote): LoadOrder[] {
  const seen = new Map<string, LoadOrder>();
  for (const line of note.lines) {
    for (const row of line.allocations) {
      if (seen.has(row.salesOrderId)) continue;
      seen.set(row.salesOrderId, {
        id: row.salesOrderId,
        number: row.salesOrderNumber,
        customer: row.customerName,
        branch: row.branchName,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

function ordersOnRoute(route: JoyWaitingRoute): LoadOrder[] {
  return route.orders.map((order) => ({
    id: order.id,
    number: order.number,
    customer: order.customerName,
    branch: order.branchName,
    when: order.orderedAt,
  }));
}

function OrderRoster({ orders }: { orders: LoadOrder[] }) {
  if (!orders.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Orders</p>
      <ul className="divide-y divide-border/80 overflow-hidden rounded-lg border bg-muted/10">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium leading-snug">{order.customer}</p>
              {(order.branch || order.when) ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[order.branch, order.when ? formatWhen(order.when) : ""].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
            <Link
              className="shrink-0 rounded-md border border-border/80 bg-background px-2 py-0.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-muted/40"
              href={`/docs/sales-order/${encodeURIComponent(order.id)}`}
            >
              {order.number}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type LoadedLine = JoyLoadNote["lines"][number];

function LoadedQtyBadge({ qty, unit }: { qty: number; unit?: string }) {
  return (
    <span className="inline-flex h-7 min-w-[3.25rem] shrink-0 items-center justify-center gap-0.5 rounded-md border border-border/80 bg-background px-1.5 text-xs font-semibold tabular-nums">
      {qty}
      <span className="text-[10px] font-normal text-muted-foreground">{unit ?? "EA"}</span>
    </span>
  );
}

function LoadedProductsPanel({
  title,
  lines,
  tone = "neutral",
  collapsible = false,
}: {
  title: string;
  lines: Array<{ line: LoadedLine; loaded: number }>;
  tone?: "neutral" | "attention";
  collapsible?: boolean;
}) {
  if (!lines.length) return null;
  const shell =
    tone === "attention"
      ? "border-amber-500/35 bg-amber-500/[0.06]"
      : "border-border/80 bg-muted/15";
  const header =
    tone === "attention"
      ? "border-amber-500/25 bg-amber-500/10"
      : "border-border/80 bg-muted/25";
  const listTone = tone === "attention" ? "divide-amber-500/20" : "divide-border/70";
  const skuLabel = `${lines.length} SKU${lines.length === 1 ? "" : "s"}`;
  const productList = (listClassName = "") => (
    <ul className={`divide-y ${listTone} ${listClassName}`.trim()}>
      {lines.map(({ line, loaded }) => (
        <li key={line.productId} className="flex items-start gap-3 px-3 py-2.5">
          <LoadedQtyBadge qty={loaded} unit={line.unit} />
          <div className="min-w-0 flex-1 pt-0.5">
            {line.sku ? (
              <p className="text-[11px] font-medium leading-none text-muted-foreground">SKU {line.sku}</p>
            ) : null}
            <p className={`text-sm leading-snug ${line.sku ? "mt-1" : ""} ${CAPS_ON_PRODUCT_CLASS}`}>{line.name}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  if (collapsible) {
    return (
      <details className={`group overflow-hidden rounded-lg border ${shell}`}>
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 marker:content-none ${header} [&::-webkit-details-marker]:hidden`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              aria-hidden
            />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{skuLabel}</span>
        </summary>
        {productList("border-t border-border/60")}
      </details>
    );
  }

  return (
    <section aria-label={title} className={`overflow-hidden rounded-lg border ${shell}`}>
      <div className={`flex items-center justify-between border-b px-3 py-2 ${header}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="text-xs tabular-nums text-muted-foreground">{skuLabel}</span>
      </div>
      {productList()}
    </section>
  );
}

function lineQtyByProduct(note: JoyLoadNote): Map<string, { loaded: number; unit?: string; sku?: string; name: string }> {
  const map = new Map<string, { loaded: number; unit?: string; sku?: string; name: string }>();
  for (const line of note.lines) {
    map.set(line.productId, {
      loaded: Number(line.loadedQty ?? 0),
      unit: line.unit,
      sku: line.sku,
      name: line.name,
    });
  }
  return map;
}


function WaitingRouteCard({
  route,
  trucks,
  busyTrucks,
  canLoad,
  dispatchName,
  dispatchId,
  stores,
  activeNote,
  focused,
  onChanged,
}: {
  route: JoyWaitingRoute;
  trucks: string[];
  busyTrucks: string[];
  canLoad: boolean;
  dispatchName: string;
  dispatchId?: string;
  stores: Array<{ id: string; name: string }>;
  activeNote?: JoyLoadNote;
  focused?: boolean;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [truck, setTruck] = React.useState("");
  const [salesReps, setSalesReps] = React.useState<PickedSalesRep[]>(route.salesReps ?? []);
  const [busy, setBusy] = React.useState(false);
  const pickStoreId = route.sourceWarehouseId || dispatchId || "";
  const pickStoreOptions = React.useMemo(() => {
    const byId = new Map<string, AsyncSearchableSelectOption>();
    if (dispatchId) byId.set(dispatchId, { id: dispatchId, label: placeLabel(dispatchName) });
    for (const store of stores) {
      if (store.id === route.warehouseId) continue;
      byId.set(store.id, { id: store.id, label: placeLabel(store.name) });
    }
    if (pickStoreId && !byId.has(pickStoreId)) {
      byId.set(pickStoreId, { id: pickStoreId, label: placeLabel(route.sourceWarehouseName || dispatchName) });
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [stores, dispatchId, dispatchName, route.warehouseId, route.sourceWarehouseName, pickStoreId]);
  const selectedPickStore =
    pickStoreOptions.find((row) => row.id === pickStoreId) ?? {
      id: pickStoreId,
      label: placeLabel(route.sourceWarehouseName || dispatchName),
    };
  const filterPickStores = React.useCallback(
    async (query: string) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return pickStoreOptions;
      return pickStoreOptions.filter((row) => row.label.toLowerCase().includes(needle));
    },
    [pickStoreOptions],
  );
  const truckOptions = React.useMemo(
    () =>
      trucks.map((plate) => ({
        id: plate,
        label: plate,
        ...(busyTrucks.includes(plate)
          ? { description: "On another load", badges: [{ label: "Busy", variant: "secondary" as const }] }
          : {}),
      })),
    [trucks, busyTrucks],
  );
  const filterTrucks = React.useCallback(
    async (query: string) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return truckOptions;
      return truckOptions.filter((row) => row.label.toLowerCase().includes(needle));
    },
    [truckOptions],
  );
  return (
    <Card id={`route-${route.warehouseId}`} className={focused ? "min-w-0 ring-2 ring-primary" : "min-w-0"}>
      <CardHeader className="space-y-1">
        <CardTitle>{placeLabel(route.warehouseName)}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {route.orderCount} order{route.orderCount === 1 ? "" : "s"} · picked from {placeLabel(route.sourceWarehouseName || dispatchName)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrderRoster orders={ordersOnRoute(route)} />
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-16 py-1 pr-3">SKU</th>
                <th className="py-1 pr-3">Product</th>
                <th className="w-24 py-1 text-right">Ordered</th>
              </tr>
            </thead>
            <tbody>
              {route.products.map((product) => (
                <tr key={product.productId} className="border-t">
                  <td className="py-1 pr-3 align-top">{product.sku ?? ""}</td>
                  <td className={`break-words py-1 pr-3 align-top ${CAPS_ON_PRODUCT_CLASS}`}>{product.name}</td>
                  <td className="py-1 text-right align-top font-medium tabular-nums">{product.orderedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeNote ? (
          <p className="rounded-md border bg-muted/50 p-3 text-sm">
            Waiting for {activeNote.number} to clear.{" "}
            <Link className="text-primary underline" href={loaderNotePath(activeNote.id)}>
              Open loader note
            </Link>
          </p>
        ) : canLoad ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-md space-y-1">
              <Label htmlFor={`load-reps-${route.warehouseId}`}>Sales reps</Label>
              <SfaSalesRepsField id={`load-reps-${route.warehouseId}`} value={salesReps} onChange={setSalesReps} disabled={busy} />
            </div>
            <div className="w-full max-w-md space-y-1">
              <Label htmlFor={`load-store-${route.warehouseId}`}>Pick from</Label>
              <AsyncSearchableSelect
                id={`load-store-${route.warehouseId}`}
                value={pickStoreId}
                selectedOption={selectedPickStore}
                onValueChange={(next) => {
                  if (!next || next === pickStoreId) return;
                  setBusy(true);
                  void setJoyRouteSourceStore({
                    warehouseId: route.warehouseId,
                    sourceWarehouseId: route.sourceWarehouseId,
                    toWarehouseId: dispatchId && next === dispatchId ? "" : next,
                  })
                    .then(async () => {
                      const name = pickStoreOptions.find((row) => row.id === next)?.label ?? dispatchName;
                      toast.success(`${route.orderCount} order${route.orderCount === 1 ? "" : "s"} now picked from ${name}.`);
                      await onChanged();
                    })
                    .catch((error) => toast.error(errorMessage(error, "Could not change the pick store")))
                    .finally(() => setBusy(false));
                }}
                loadOptions={filterPickStores}
                searchDebounceMs={0}
                disabled={busy}
                placeholder="Pick store"
                searchPlaceholder="Find a store"
                emptyMessage="No store matches."
                wrapLabels
                minDropdownWidth={300}
              />
            </div>
            <div className="w-full max-w-md space-y-1">
              <Label htmlFor={`load-truck-${route.warehouseId}`}>Truck</Label>
              <AsyncSearchableSelect
                id={`load-truck-${route.warehouseId}`}
                value={truck}
                selectedOption={truck ? { id: truck, label: truck } : null}
                onValueChange={(next) => {
                  if (!next) {
                    setTruck("");
                    return;
                  }
                  if (busyTrucks.includes(next)) {
                    toast.error(`${next} is already on another load.`);
                    return;
                  }
                  setTruck(next);
                }}
                loadOptions={filterTrucks}
                searchDebounceMs={0}
                disabled={busy}
                placeholder="Choose a truck"
                searchPlaceholder="Search plate"
                emptyMessage="No truck matches."
                wrapLabels
                minDropdownWidth={280}
              />
            </div>
            <Button
              disabled={!truck || busy}
              onClick={() => {
                setBusy(true);
                void createJoyLoadNote({
                  warehouseId: route.warehouseId, truck, sourceWarehouseId: route.sourceWarehouseId,
                  salesRepIds: salesReps.map((rep) => rep.id),
                })
                  .then((note) => {
                    toast.success(`Loader note ${note.number} created for ${note.truck}.`);
                    router.push(loaderNotePath(note.id));
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
  onCancelled,
}: {
  note: JoyLoadNote;
  canLoad: boolean;
  dispatchName: string;
  onChanged: () => Promise<void>;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = React.useState<Record<string, string>>({});
  const [busyPlan, setBusyPlan] = React.useState<JoyLoadDocumentPlan | "cancel" | null>(null);
  const busy = busyPlan != null;
  const rows = note.lines.map((line) => {
    const qty = parseQty(loaded[line.productId], line.orderedQty);
    return { line, qty, short: roundQty(line.orderedQty - qty) };
  });
  const invalid = rows.some((row) => !Number.isFinite(row.qty) || row.qty < 0 || row.qty > row.line.orderedQty);
  const full = !invalid && rows.every((row) => Math.abs(row.short) < 0.0001);
  return (
    <Card id={`note-${note.id}`} className="min-w-0">
      <LoadNoteHeader
        note={note}
        routeHint={`Picked from ${placeLabel(note.fulfilmentFromOrder ? note.fulfilmentWarehouseName : dispatchName || note.fulfilmentWarehouseName)}`}
      />
      <CardContent className="space-y-4">
        <OrderRoster orders={ordersOnNote(note)} />
        <Button variant="outline" size="sm" onClick={() => void printJoyLoadNotePdf(note, (message) => toast.error(message))}>
          Print loader note
        </Button>
        <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-16 py-1 pr-3">SKU</th>
              <th className="py-1 pr-3">Product</th>
              <th className="w-24 py-1 pr-3 text-right">Ordered</th>
              <th className="w-28 py-1 pr-3 text-right">Loaded</th>
              <th className="w-24 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, short }) => (
              <tr key={line.productId} className={`border-t ${Math.abs(short) > 0.0001 ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}>
                <td className="py-1 pr-3 align-top">{line.sku ?? ""}</td>
                <td className={`break-words py-1 pr-3 align-top ${CAPS_ON_PRODUCT_CLASS}`}>{line.name}</td>
                <td className="py-1 pr-3 text-right align-top tabular-nums">{line.orderedQty}</td>
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
        </div>
        {canLoad ? (
          <div className="space-y-3">
            {full ? (
              note.results.some((row) => row.deliveryNoteId || row.invoiceId) ? (
              <LoadDocumentActions
                busyPlan={busyPlan === "cancel" ? null : busyPlan}
                disabled={invalid}
                locked={null}
                onChoose={(plan) => {
                  setBusyPlan(plan);
                  void recordJoyLoaded(
                    note.id,
                    rows.map((row) => ({ productId: row.line.productId, loadedQty: row.qty })),
                    plan
                  )
                    .then(async (updated) => {
                      toast.success(
                        plan === "delivery_note"
                          ? `${note.number} loaded in full. Delivery notes are ready. Invoices are on standby.`
                          : `${note.number} loaded in full. Invoices and delivery notes are ready.`
                      );
                      const href = createdDocumentsHref(plan, updated);
                      if (href) {
                        router.push(href);
                        return;
                      }
                      await onChanged();
                    })
                    .catch(async (error) => {
                      toast.error(errorMessage(error, "Could not record the load"));
                      await onChanged();
                    })
                    .finally(() => setBusyPlan(null));
                }}
              />
              ) : (
              <Button
                disabled={invalid || busy}
                onClick={() => {
                  setBusyPlan("delivery_note");
                  void recordJoyLoaded(
                    note.id,
                    rows.map((row) => ({ productId: row.line.productId, loadedQty: row.qty }))
                  )
                    .then(async () => {
                      toast.success(`${note.number} confirmed. Create a delivery note for each order.`);
                      await onChanged();
                    })
                    .catch(async (error) => {
                      toast.error(errorMessage(error, "Could not confirm the loader note"));
                      await onChanged();
                    })
                    .finally(() => setBusyPlan(null));
                }}
              >
                {busy ? "Working…" : "Confirm loader note"}
              </Button>
              )
            ) : (
              <Button
                disabled={invalid || busy}
                onClick={() => {
                  setBusyPlan("both");
                  void recordJoyLoaded(
                    note.id,
                    rows.map((row) => ({ productId: row.line.productId, loadedQty: row.qty }))
                  )
                    .then(async () => {
                      toast.success(`${note.number} is short. Finance assigns the short across the orders.`);
                      await onChanged();
                    })
                    .catch(async (error) => {
                      toast.error(errorMessage(error, "Could not record the load"));
                      await onChanged();
                    })
                    .finally(() => setBusyPlan(null));
                }}
              >
                {busy ? "Working…" : "Confirm short load"}
              </Button>
            )}
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                setBusyPlan("cancel");
                void cancelJoyLoadNote(note.id)
                  .then(async () => {
                    toast.success(`${note.number} cancelled. Its orders are waiting again.`);
                    if (onCancelled) onCancelled();
                    else await onChanged();
                  })
                  .catch((error) => toast.error(errorMessage(error, "Could not cancel")))
                  .finally(() => setBusyPlan(null));
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
  const router = useRouter();
  const [qty, setQty] = React.useState<Record<string, string>>({});
  const [busyPlan, setBusyPlan] = React.useState<JoyLoadDocumentPlan | null>(null);
  const [recheckBusy, setRecheckBusy] = React.useState(false);
  const busy = busyPlan != null || recheckBusy;
  const fixedPlan = lockedDocumentPlan(note);
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
  const valuationIssues = note.valuationIssues ?? [];
  const routeNeedsReview = !!note.fulfilmentWarehouseId && note.routeWarehouseId === note.fulfilmentWarehouseId;
  const valuationError = /opening (company-average valuation|stock value)/i.test(note.lastError ?? "");
  const mappingError = /UOM Mapping Required/i.test(note.lastError ?? "");
  const showPreviousError = note.lastError &&
    (!mappingError || note.mappingIssues === undefined) &&
    (!valuationError || note.valuationIssues === undefined);
  const allocationChanged = lines.some(({ allocations }) =>
    allocations.some(({ row, value }) => Math.abs(row.invoiceQty - value) >= 0.0001)
  );
  const canSubmit = ready && ((!mappingIssues.length && !valuationIssues.length) || allocationChanged);
  const completed = note.results.filter((row) => row.stockIssued).length;
  return (
    <Card id={`note-${note.id}`}>
      <LoadNoteHeader
        note={note}
        status={
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${(mappingIssues.length || valuationIssues.length || routeNeedsReview)
            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
            : "bg-muted text-muted-foreground"}`}>
            {valuationIssues.length ? "Opening value needed" : mappingIssues.length ? "Mapping needed" :
              routeNeedsReview ? "Check route" : shortLines.length ? "Finance review" : "Ready to retry"}
          </span>
        }
      />
      <CardContent className="space-y-4">
        <OrderRoster orders={ordersOnNote(note)} />
        {routeNeedsReview && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            DISPATCH is listed as the route for this load. Confirm the delivery route on the sales order before the truck leaves.
            {ordersOnNote(note)[0] ? (
              <>
                {" "}
                <Link className="text-primary underline" href={`/docs/sales-order/${encodeURIComponent(ordersOnNote(note)[0].id)}`}>Open the sales order</Link>
              </>
            ) : null}
          </p>
        )}
        {valuationIssues.length > 0 && (
          <section aria-label="Opening stock values" className="overflow-hidden rounded-lg border border-amber-500/40 bg-amber-500/[0.06] text-sm">
            <div className="border-b border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
              <p className="font-semibold text-amber-950 dark:text-amber-50">Finance needs to reconcile opening stock values</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Set opening costs for what was loaded, then recheck this load.</p>
            </div>
            <ul className="divide-y divide-amber-500/20">
              {valuationIssues.map((issue) => {
                const onTruck = lineQtyByProduct(note).get(issue.productId);
                const qty = onTruck?.loaded;
                return (
                  <li key={issue.productId}>
                    <Link
                      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-amber-500/10"
                      href={`/inventory/opening-costs?products=${encodeURIComponent(issue.productId)}`}
                    >
                      {qty != null && Number.isFinite(qty) ? (
                        <LoadedQtyBadge qty={qty} unit={onTruck?.unit} />
                      ) : (
                        <span className="size-7 shrink-0 rounded-md border border-dashed border-amber-500/40" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        {issue.sku ? (
                          <span className="block text-[11px] font-medium leading-none text-muted-foreground">SKU {issue.sku}</span>
                        ) : null}
                        <span className={`block leading-snug group-hover:text-primary ${issue.sku ? "mt-1" : ""} ${CAPS_ON_PRODUCT_CLASS}`}>
                          {issue.name}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-amber-500/25 bg-amber-500/[0.04] px-3 py-2.5">
              <Button asChild variant="outline" size="sm" className="border-amber-500/30 bg-background/80">
                <Link href={`/inventory/opening-costs?products=${encodeURIComponent(valuationIssues.map((issue) => issue.productId).join(","))}`}>
                  Set opening costs
                </Link>
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={async () => {
                setRecheckBusy(true);
                try { await onChanged(); }
                finally { setRecheckBusy(false); }
              }}>Recheck opening values</Button>
            </div>
          </section>
        )}
        {mappingIssues.length ? (
          <section aria-label="SKU mapping issues" className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{mappingIssues.length} SKU mapping{mappingIssues.length === 1 ? "" : "s"} needed</p>
                <p className="text-sm text-muted-foreground">Verify the sales unit against the SKU’s stock unit, then recheck this load.</p>
              </div>
              <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
                setRecheckBusy(true);
                try { await onChanged(); }
                finally { setRecheckBusy(false); }
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
        {note.results.some((result) => result.invoiceId || result.deliveryNoteId) && (
          <div className="rounded-lg border border-border/80 bg-muted/10 px-3 py-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Existing documents</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {note.results.flatMap((result) => [
                result.invoiceId && (
                  <Link
                    key={result.invoiceId}
                    className="rounded-md border border-border/80 bg-background px-2 py-0.5 font-mono text-xs font-medium text-primary hover:bg-muted/40"
                    href={`/docs/invoice/${encodeURIComponent(result.invoiceId)}`}
                  >
                    {result.invoiceNumber || "Invoice"}
                  </Link>
                ),
                result.deliveryNoteId && (
                  <Link
                    key={result.deliveryNoteId}
                    className="rounded-md border border-border/80 bg-background px-2 py-0.5 font-mono text-xs font-medium text-primary hover:bg-muted/40"
                    href={`/docs/delivery-note/${encodeURIComponent(result.deliveryNoteId)}`}
                  >
                    {result.deliveryNoteNumber || "Delivery note"}
                  </Link>
                ),
              ])}
            </div>
          </div>
        )}
        {completed > 0 && (
          <p className="text-sm text-muted-foreground">
            {completed} order{completed === 1 ? "" : "s"} already {fixedPlan === "delivery_note" ? "issued on a delivery note" : "invoiced and issued"}.
          </p>
        )}
        {fullLines.length ? (
          <LoadedProductsPanel title="Loaded in full" lines={fullLines} collapsible />
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
                    <th className="px-3 py-1.5 text-right font-normal">To send</th>
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
                            aria-label={`Quantity for ${row.salesOrderNumber}`}
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
        {canFinance && note.results.some((row) => row.deliveryNoteId || row.invoiceId) ? (
          <LoadDocumentActions
            busyPlan={busyPlan}
            disabled={!canSubmit || note.status !== "AWAITING_FINANCE"}
            locked={fixedPlan}
            resumeDeliveryNote={note.results.some((row) => row.deliveryNoteId)}
            resumeInvoice={note.results.some((row) => row.invoiceId)}
            onChoose={(plan) => {
              setBusyPlan(plan);
              void allocateJoyLoad(
                note.id,
                lines.flatMap((line) =>
                  line.allocations.map((a) => ({ salesOrderId: a.row.salesOrderId, lineId: a.row.lineId, quantity: a.value }))
                ),
                plan
              )
                .then(async (updated) => {
                  toast.success(
                    plan === "delivery_note"
                      ? `${note.number} has delivery notes. Invoices are on standby.`
                      : `${note.number} invoiced. Ready for the truck to leave.`
                  );
                  const href = createdDocumentsHref(plan, updated);
                  if (href) {
                    router.push(href);
                    return;
                  }
                  await onChanged();
                })
                .catch(async (error) => {
                  toast.error(errorMessage(error, plan === "delivery_note" ? "Could not create the delivery notes" : "Could not create the invoices"));
                  await onChanged();
                })
                .finally(() => setBusyPlan(null));
            }}
          />
        ) : canFinance ? (
          <Button
            disabled={!canSubmit || note.status !== "AWAITING_FINANCE" || busy}
            onClick={() => {
              setBusyPlan("delivery_note");
              void allocateJoyLoad(
                note.id,
                lines.flatMap((line) =>
                  line.allocations.map((a) => ({ salesOrderId: a.row.salesOrderId, lineId: a.row.lineId, quantity: a.value }))
                )
              )
                .then(async () => {
                  toast.success(`${note.number} confirmed. Create a delivery note for each order.`);
                  await onChanged();
                })
                .catch(async (error) => {
                  toast.error(errorMessage(error, "Could not confirm the loader note"));
                  await onChanged();
                })
                .finally(() => setBusyPlan(null));
            }}
          >
            {busy ? "Working…" : "Confirm loader note"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Finance assigns the short across the orders, then the loader note can be confirmed.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmedNoteCard({
  note,
  canLoad,
  canFinance,
  onChanged,
}: {
  note: JoyLoadNote;
  canLoad: boolean;
  canFinance: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const orders = ordersOnNote(note);
  const resultByOrder = new Map(note.results.map((row) => [row.salesOrderId, row]));
  const packed = (orderId: string) =>
    note.lines.some((line) => line.allocations.some((row) => row.salesOrderId === orderId && row.invoiceQty > 0.0001));
  const pendingNotes = orders.filter((order) => packed(order.id) && !resultByOrder.get(order.id)?.deliveryNoteId);
  const pendingInvoices = orders.filter((order) => {
    const row = resultByOrder.get(order.id);
    return Boolean(row?.deliveryNoteId && !row.invoiceId);
  });
  const run = (key: string, work: () => Promise<void>, failure: string) => {
    setBusy(key);
    void work()
      .catch((error) => toast.error(errorMessage(error, failure)))
      .finally(() => setBusy(null));
  };
  return (
    <Card id={`note-${note.id}`} className="min-w-0">
      <LoadNoteHeader note={note} routeHint="Loader note confirmed" />
      <CardContent className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => void printJoyLoadNotePdf(note, (message) => toast.error(message))}>
          Print loader note
        </Button>
        <div className="space-y-2 text-sm">
          {orders.map((order) => {
            const row = resultByOrder.get(order.id);
            return (
              <div key={order.id} className="flex flex-wrap items-center gap-2 border-t py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{order.number}</span>
                  <span className="text-muted-foreground"> · {order.customer}</span>
                </span>
                {row?.deliveryNoteId ? (
                  <Link className="text-primary hover:underline" href={`/docs/delivery-note/${row.deliveryNoteId}`}>
                    {row.deliveryNoteNumber ?? "Delivery note"}
                  </Link>
                ) : canLoad && packed(order.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy != null}
                    onClick={() => run(`dn:${order.id}`, async () => {
                      await createJoyDeliveryNotes(note.id, order.id);
                      toast.success(`Delivery note created for ${order.number}.`);
                      await onChanged();
                    }, "Could not create the delivery note")}
                  >
                    {busy === `dn:${order.id}` ? "Working…" : "Create delivery note"}
                  </Button>
                ) : (
                  <span className="text-muted-foreground">Nothing packed</span>
                )}
                {row?.creditNoteId ? (
                  <Link className="text-primary hover:underline" href={`/docs/credit-note/${row.creditNoteId}`}>
                    {row.creditNoteNumber ?? "Credit note"}
                  </Link>
                ) : null}
                {row?.invoiceId ? (
                  <Link className="text-primary hover:underline" href={`/docs/invoice/${row.invoiceId}`}>
                    {row.invoiceNumber ?? "Invoice"}
                  </Link>
                ) : row?.deliveryNoteId && canFinance ? (
                  <Button
                    size="sm"
                    disabled={busy != null}
                    onClick={() => run(`inv:${order.id}`, async () => {
                      await generateJoyInvoices(note.id, order.id);
                      toast.success(`Invoice created for ${order.number}.`);
                      await onChanged();
                    }, "Could not create the invoice")}
                  >
                    {busy === `inv:${order.id}` ? "Working…" : "Generate invoice"}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {canLoad && pendingNotes.length > 0 ? (
            <Button
              variant="outline"
              disabled={busy != null}
              onClick={() => run("dns", async () => {
                await createJoyDeliveryNotes(note.id);
                toast.success(`Delivery notes created for ${note.number}.`);
                await onChanged();
              }, "Could not create the delivery notes")}
            >
              {busy === "dns" ? "Working…" : "Create delivery notes"}
            </Button>
          ) : null}
          {canFinance && pendingInvoices.length > 0 ? (
            <Button
              disabled={busy != null}
              onClick={() => run("invs", async () => {
                await generateJoyInvoices(note.id);
                toast.success(`Invoices created for ${note.number}.`);
                await onChanged();
              }, "Could not create the invoices")}
            >
              {busy === "invs" ? "Working…" : "Generate invoices"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadyToLeaveCard({ note, canLoad, onChanged }: { note: JoyLoadNote; canLoad: boolean; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Card id={`note-${note.id}`}>
      <LoadNoteHeader note={note} routeHint="Ready to leave" />
      <CardContent className="space-y-3">
        <OrderRoster orders={ordersOnNote(note)} />
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
        <p className="text-sm text-muted-foreground">
          {note.documentPlan === "delivery_note"
            ? "Delivery notes go with the truck. Invoices are on standby and can be raised from each note whenever you are ready."
            : "Sales orders keep the ordered quantities. Invoices show what was loaded."}
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
      <LoadNoteHeader note={note} routeHint="Left today" titleClassName="text-base" headerClassName="space-y-2 py-4" />
      <CardContent className="space-y-3 pb-4 text-sm">
        <OrderRoster orders={ordersOnNote(note)} />
        {note.documentPlan === "delivery_note" ? (
          <p className="text-muted-foreground">Invoices are on standby. Open a delivery note and create the invoice whenever you are ready.</p>
        ) : null}
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
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);
  if (!items.length) {
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
      {items}
    </section>
  );
}

function TruckLoadTable({ notes }: { notes: JoyLoadNote[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Loader note</th>
            <th className="px-3 py-2 font-medium">Truck</th>
            <th className="px-3 py-2 font-medium">Route</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Stage</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => {
            const created = formatWhenParts(note.createdAt || note.date);
            return (
              <tr key={note.id} className="border-t">
                <td className="px-3 py-2.5 font-medium">{note.number}</td>
                <td className="px-3 py-2.5 font-mono tracking-wide">{note.truck}</td>
                <td className="px-3 py-2.5">{placeLabel(note.routeWarehouseName)}</td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{created?.compact ?? ""}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{truckStage(note)}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link className="font-medium text-primary hover:underline" href={loaderNotePath(note.id)}>
                    Open loader note
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JoyRouteLoadsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const focusWarehouse = params.get("warehouse") ?? "";
  const focusNote = params.get("note") ?? "";
  const step = params.get("step");
  const canLoad = useHasPermission("inventory.write");
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

  const focusedNote = focusNote
    ? data?.notes.find((note) => note.id === focusNote)
    : focusWarehouse ? data?.notes.find((note) => note.routeWarehouseId === focusWarehouse && note.status !== "INVOICED") : undefined;
  const financeView = step === "finance" || (
    step !== "load" && step !== "leave" && step !== "dispatch" &&
    (focusedNote?.status === "AWAITING_FINANCE" || focusedNote?.status === "INVOICING")
  );
  const queueHref = (queue: "dispatch" | "finance") => `?step=${queue}`;

  React.useEffect(() => {
    if (focusNote) router.replace(loaderNotePath(focusNote));
  }, [focusNote, router]);

  React.useEffect(() => {
    if (!data) return;
    resetShellScroll();
  }, [data]);

  if (!data) return <p className="p-3 text-sm text-muted-foreground">Loading routes…</p>;

  const waiting = focusWarehouse
    ? [...data.waiting].sort((a, b) => Number(b.warehouseId === focusWarehouse) - Number(a.warehouseId === focusWarehouse))
    : data.waiting;
  const openedRoute = focusWarehouse ? waiting.find((route) => route.warehouseId === focusWarehouse) : undefined;
  const finance = data.notes.filter((note) => note.status === "AWAITING_FINANCE" || note.status === "INVOICING");
  const onTheRoad = data.notes.filter((note) => !note.departedAt);
  const left = data.notes.filter((note) => note.status === "INVOICED" && note.departedAt);

  const loadBlocks =
    !financeView
      ? [
          <Section key="waiting" id="step-load" title="Choose a truck" empty="No approved orders are waiting for a truck.">
            {waiting.map((route) => (
              <WaitingRouteCard
                key={`${route.warehouseId}|${route.sourceWarehouseId ?? ""}`}
                route={route}
                trucks={data.trucks}
                busyTrucks={data.busyTrucks}
                canLoad={canLoad}
                dispatchName={data.dispatchWarehouseName}
                dispatchId={data.dispatchWarehouseId}
                stores={data.stores ?? []}
                onChanged={reload}
                focused={route.warehouseId === focusWarehouse}
                activeNote={data.notes.find((note) => note.routeWarehouseId === route.warehouseId &&
                  (!route.sourceWarehouseId || !note.fulfilmentWarehouseId || note.fulfilmentWarehouseId === route.sourceWarehouseId) &&
                  (note.status === "OPEN" || note.status === "AWAITING_FINANCE" || note.status === "INVOICING"))}
              />
            ))}
          </Section>,
          <Section key="trucks" id="step-trucks" title="Trucks" empty="No truck is on a loader note.">
            {onTheRoad.length ? <TruckLoadTable notes={onTheRoad} /> : null}
          </Section>,
        ]
      : [];
  const financeBlock =
    financeView
      ? [
          <Section key="finance" id="step-finance" title="Loads awaiting finance" empty="No loads need finance review.">
            {finance.length ? <TruckLoadTable notes={finance} /> : null}
          </Section>,
        ]
      : [];
  const leaveBlocks =
    !financeView
      ? [
          <Section key="left" id="step-left" title="Left today" empty="No trucks have left yet today.">
            {left.length ? <TruckLoadTable notes={left} /> : null}
          </Section>,
        ]
      : [];

  return (
    <div className="min-w-0 space-y-4 p-3 sm:px-5">
      <nav aria-label="Route load queues" className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={financeView ? "ghost" : "secondary"}>
          <Link href={queueHref("dispatch")} aria-current={financeView ? undefined : "page"}>Dispatch</Link>
        </Button>
        <Button asChild size="sm" variant={financeView ? "secondary" : "ghost"}>
          <Link href={queueHref("finance")} aria-current={financeView ? "page" : undefined}>Finance Review <Badge variant="outline">{finance.length}</Badge></Link>
        </Button>
      </nav>
      {!financeView && (
        <p className="text-sm text-muted-foreground">
          {openedRoute
            ? `${placeLabel(openedRoute.warehouseName)} is first, from the sales order. Pick stock from ${placeLabel(openedRoute.sourceWarehouseName || data.dispatchWarehouseName)}.`
            : `Choose a route and a truck. Open the loader note to confirm what was picked against what was ordered.`}
        </p>
      )}
      {financeView ? financeBlock : step === "leave" ? [...leaveBlocks, ...loadBlocks] : [...loadBlocks, ...leaveBlocks]}
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

function LoadNoteSalesReps({ note, canEdit, onSaved }: { note: JoyLoadNote; canEdit: boolean; onSaved: () => Promise<void> }) {
  const saved = React.useMemo(() => note.salesReps ?? [], [note.salesReps]);
  const [reps, setReps] = React.useState<PickedSalesRep[]>(saved);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setReps(saved), [saved]);
  const dirty = reps.map((rep) => rep.id).join("|") !== saved.map((rep) => rep.id).join("|");
  const editable = canEdit && note.status !== "CANCELLED";
  return (
    <section className="space-y-2 rounded-md border p-3" aria-labelledby="loader-note-reps">
      <h2 id="loader-note-reps" className="text-sm font-medium">Sales reps</h2>
      {editable ? (
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-full max-w-md">
            <SfaSalesRepsField id="loader-note-rep-search" value={reps} onChange={setReps} disabled={busy} />
          </div>
          {dirty && (
            <div className="flex gap-2">
              <Button
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void setJoyLoadSalesReps(note.id, reps.map((rep) => rep.id))
                    .then(async () => {
                      toast.success("Sales reps saved. The loader note PDF now shows them.");
                      await onSaved();
                    })
                    .catch((error) => toast.error(errorMessage(error, "Could not save the sales reps")))
                    .finally(() => setBusy(false));
                }}
              >
                Save reps
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setReps(saved)}>Undo</Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {saved.length ? saved.map((rep) => [rep.name, rep.phone].filter(Boolean).join(" · ")).join(", ") : "No sales rep on this load."}
        </p>
      )}
    </section>
  );
}

export function JoyLoaderNote({ noteId }: { noteId: string }) {
  const router = useRouter();
  const canLoad = useHasPermission("inventory.write");
  const canFinance = useHasPermission("finance.write");
  const canSell = useHasPermission("sales.write");
  const [data, setData] = React.useState<JoyLoadNotes | null>(null);

  const reload = React.useCallback(async () => {
    try {
      setData(await fetchJoyLoadNotes());
    } catch (error) {
      toast.error(errorMessage(error, "Could not load the loader note"));
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const note = data?.notes.find((item) => item.id === noteId);
  const back = (
    <Link className="text-sm text-muted-foreground hover:text-foreground hover:underline" href="/warehouse/route-pick-lists">
      Route loads
    </Link>
  );

  if (!data) return <p className="p-3 text-sm text-muted-foreground">Loading the loader note…</p>;
  if (!note) {
    return (
      <div className="space-y-3 p-3 sm:px-5">
        {back}
        <p className="text-sm text-muted-foreground">This loader note is no longer on the board.</p>
      </div>
    );
  }

  const created = formatWhen(note.createdAt || note.date);
  return (
    <div className="min-w-0 space-y-4 p-3 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div className="min-w-0 space-y-1">
          {back}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-mono text-2xl font-semibold tracking-wide">{note.truck}</h1>
            <p className="text-sm text-muted-foreground">
              {note.number}
              <span aria-hidden> · </span>
              {placeLabel(note.routeWarehouseName)}
              {created ? (
                <>
                  <span aria-hidden> · </span>
                  Created {created}
                </>
              ) : null}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{truckStage(note)}</p>
      </div>
      <LoadNoteSalesReps note={note} canEdit={canLoad || canSell} onSaved={reload} />
      {note.status === "OPEN" ? (
        <LoadingNoteCard
          note={note}
          canLoad={canLoad}
          dispatchName={data.dispatchWarehouseName}
          onChanged={reload}
          onCancelled={() => router.push("/warehouse/route-pick-lists")}
        />
      ) : note.status === "AWAITING_FINANCE" || note.status === "INVOICING" ? (
        <FinanceNoteCard note={note} canFinance={canFinance} onChanged={reload} />
      ) : note.status === "CONFIRMED" ? (
        <ConfirmedNoteCard note={note} canLoad={canLoad} canFinance={canFinance} onChanged={reload} />
      ) : note.status === "INVOICED" && !note.departedAt ? (
        <ReadyToLeaveCard note={note} canLoad={canLoad} onChanged={reload} />
      ) : (
        <LeftTodayCard note={note} />
      )}
    </div>
  );
}
