"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import {
  fetchJoyRouteLoads,
  invoiceJoyRouteLoad,
  type JoyRouteLoad,
} from "@/lib/api/joy-dispatch";
import { toast } from "sonner";

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function JoyRouteLoadsInner() {
  const focus = useSearchParams().get("warehouse") ?? "";
  const [loads, setLoads] = React.useState<JoyRouteLoad | null>(null);
  const [truckByRoute, setTruckByRoute] = React.useState<Record<string, string>>({});
  const [loadedByProduct, setLoadedByProduct] = React.useState<Record<string, string>>({});
  const [qtyByLine, setQtyByLine] = React.useState<Record<string, string>>({});
  const [busyRoute, setBusyRoute] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<Record<string, { invoices: Array<{ id: string; number: string }>; deliveryNotes: Array<{ id: string; number: string }> }>>({});

  const reload = React.useCallback(async () => {
    const payload = await fetchJoyRouteLoads();
    setLoads(payload);
  }, []);

  React.useEffect(() => {
    void reload().catch((error: Error) => toast.error(error.message));
  }, [reload]);

  React.useEffect(() => {
    if (!focus) return;
    document.getElementById(`route-${focus}`)?.scrollIntoView({ block: "start" });
  }, [focus, loads]);

  if (!loads) return <p className="text-sm text-muted-foreground">Loading routes…</p>;
  if (!loads.routes.length) {
    return <p className="text-sm text-muted-foreground">No approved orders are waiting for a truck. Fulfilment still leaves from {loads.dispatchWarehouseName}.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Goods are picked from {loads.dispatchWarehouseName}. Each delivery warehouse below is one truck.</p>
      {Object.entries(created).map(([warehouseId, result]) => (
        <div key={warehouseId} className="space-y-1 text-sm">
          {result.invoices.map((invoice) => (
            <Link key={invoice.id} className="block text-primary" href={`/docs/invoice/${invoice.id}`}>{invoice.number}</Link>
          ))}
          {result.deliveryNotes.map((note) => (
            <Link key={note.id} className="block text-primary" href={`/docs/delivery-note/${note.id}`}>{note.number}</Link>
          ))}
        </div>
      ))}
      {loads.routes.map((route) => {
        const lines = route.products.map((product) => {
          const loadedRaw = loadedByProduct[`${route.warehouseId}:${product.productId}`];
          const loadedQty = loadedRaw == null || loadedRaw === "" ? product.orderedQty : Number(loadedRaw);
          const orders = route.orders.flatMap((order) =>
            order.lines
              .filter((line) => line.productId === product.productId)
              .map((line) => {
                const key = `${route.warehouseId}:${order.id}:${line.lineId}`;
                const raw = qtyByLine[key];
                const quantity = raw == null || raw === "" ? line.quantity : Number(raw);
                return { order, line, key, quantity: Number.isFinite(quantity) ? quantity : 0 };
              })
          );
          const assigned = roundQty(orders.reduce((sum, row) => sum + row.quantity, 0));
          const loaded = Number.isFinite(loadedQty) ? loadedQty : 0;
          return { product, loaded, orders, gap: roundQty(loaded - assigned), short: roundQty(loaded) !== product.orderedQty };
        });
        const ready = Boolean(truckByRoute[route.warehouseId]) && lines.every((line) => Math.abs(line.gap) < 0.0001);
        const result = created[route.warehouseId];
        return (
          <Card key={route.warehouseId} id={`route-${route.warehouseId}`}>
            <CardHeader>
              <CardTitle>{route.warehouseName}</CardTitle>
              <p className="text-sm text-muted-foreground">{route.orderCount} order{route.orderCount === 1 ? "" : "s"} · loaded from {loads.dispatchWarehouseName}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2">
                <Label>Truck</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={truckByRoute[route.warehouseId] ?? ""}
                  onChange={(event) => setTruckByRoute((current) => ({ ...current, [route.warehouseId]: event.target.value }))}
                >
                  <option value="">Choose a truck</option>
                  {loads.trucks.map((truck) => (
                    <option key={truck} value={truck}>{truck}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.product.productId} className={`rounded-md border p-3 ${Math.abs(line.gap) > 0.0001 ? "border-amber-500" : ""}`}>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="min-w-40">
                        <p className={`text-sm font-medium ${CAPS_ON_PRODUCT_CLASS}`}>{line.product.name}</p>
                        <p className="text-xs text-muted-foreground">Ordered {line.product.orderedQty}</p>
                      </div>
                      <div className="space-y-1">
                        <Label>Loaded</Label>
                        <Input
                          className="h-8 w-24"
                          inputMode="decimal"
                          value={loadedByProduct[`${route.warehouseId}:${line.product.productId}`] ?? String(line.product.orderedQty)}
                          onChange={(event) =>
                            setLoadedByProduct((current) => ({
                              ...current,
                              [`${route.warehouseId}:${line.product.productId}`]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <p className="pb-2 text-sm">
                        {Math.abs(line.gap) < 0.0001
                          ? "Matches the truck."
                          : line.gap < 0
                            ? `Take ${Math.abs(line.gap)} off the orders.`
                            : `Put ${line.gap} back on the orders.`}
                      </p>
                    </div>
                    {line.short ? (
                      <div className="mt-3 space-y-2">
                        {line.orders.map((row) => (
                          <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <span>
                              {row.order.number} · {row.order.customerName}
                              {row.order.branchName ? ` · ${row.order.branchName}` : ""}
                              <span className="text-muted-foreground"> · ordered {row.line.quantity}</span>
                            </span>
                            <Input
                              className="h-8 w-24"
                              inputMode="decimal"
                              value={qtyByLine[row.key] ?? String(row.line.quantity)}
                              onChange={(event) => setQtyByLine((current) => ({ ...current, [row.key]: event.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <Button
                disabled={!ready || busyRoute === route.warehouseId}
                onClick={() => {
                  setBusyRoute(route.warehouseId);
                  void invoiceJoyRouteLoad({
                    warehouseId: route.warehouseId,
                    truck: truckByRoute[route.warehouseId],
                    lines: lines.map((line) => ({
                      productId: line.product.productId,
                      loadedQty: line.loaded,
                      orders: line.orders.map((row) => ({
                        salesOrderId: row.order.id,
                        lineId: row.line.lineId,
                        quantity: row.quantity,
                      })),
                    })),
                  })
                    .then((payload) => {
                      setCreated((current) => ({ ...current, [route.warehouseId]: payload }));
                      toast.success(`Invoices created for ${route.warehouseName}.`);
                      return reload();
                    })
                    .catch((error: Error) => toast.error(error.message))
                    .finally(() => setBusyRoute(null));
                }}
              >
                Create invoices and delivery notes
              </Button>
              {result ? (
                <p className="text-sm text-muted-foreground">Created for this route. The links stay at the top of the page.</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
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
