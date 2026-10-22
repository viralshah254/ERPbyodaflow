"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import { fetchDistributionRoutes, type DistributionRouteRow } from "@/lib/api/distribution";
import { fetchSalesDocumentFlowApi } from "@/lib/api/sales-document-flow";
import {
  createJoyPickList,
  emailJoyDispatchNote,
  fetchJoyMovementSummary,
  fetchJoyPickListTally,
  fetchJoyPickLists,
  fetchJoySalesOrders,
  JOY_WHERE_NOW,
  recordJoyDamage,
  recordJoyShort,
  reviewJoyMovementSummary,
  saveJoyPickedQuantities,
  verifyJoyPickList,
  type JoyMovementSummary,
  type JoyPickList,
  type JoySalesOrder,
  type JoyTallyLine,
} from "@/lib/api/joy-dispatch";
import { toast } from "sonner";

export default function RoutePickListsPage() {
  const [orders, setOrders] = React.useState<JoySalesOrder[]>([]);
  const [lists, setLists] = React.useState<JoyPickList[]>([]);
  const [warehouses, setWarehouses] = React.useState<BackendWarehouse[]>([]);
  const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [routeName, setRouteName] = React.useState("");
  const [vehicleNumber, setVehicleNumber] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [active, setActive] = React.useState<JoyPickList | null>(null);
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [shortProductId, setShortProductId] = React.useState("");
  const [shortQty, setShortQty] = React.useState("");
  const [whereNow, setWhereNow] = React.useState("");
  const [damageProductId, setDamageProductId] = React.useState("");
  const [damageQty, setDamageQty] = React.useState("");
  const [damageReason, setDamageReason] = React.useState("");
  const [emailTo, setEmailTo] = React.useState("");
  const [summaryWarehouseId, setSummaryWarehouseId] = React.useState("");
  const [summaryFrom, setSummaryFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [summaryTo, setSummaryTo] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = React.useState<JoyMovementSummary | null>(null);
  const [summaryReason, setSummaryReason] = React.useState("");
  const [routes, setRoutes] = React.useState<DistributionRouteRow[]>([]);
  const [flowOn, setFlowOn] = React.useState<boolean | null>(null);
  const [tally, setTally] = React.useState<JoyTallyLine[]>([]);
  const [damageWarehouseId, setDamageWarehouseId] = React.useState("");

  const load = React.useCallback(async () => {
    const flow = await fetchSalesDocumentFlowApi();
    const enabled = flow.mode === "joy_dispatch";
    setFlowOn(enabled);
    if (!enabled) return;
    const [orderRows, listRows, warehouseRows, routeRows] = await Promise.all([
      fetchJoySalesOrders(),
      fetchJoyPickLists(),
      fetchWarehousesApi(),
      fetchDistributionRoutes().catch(() => [] as DistributionRouteRow[]),
    ]);
    setOrders(orderRows);
    setLists(listRows);
    setWarehouses(warehouseRows.filter((row) => row.status !== "INACTIVE"));
    setRoutes(routeRows);
  }, []);

  React.useEffect(() => {
    void load().catch((error: Error) => toast.error(error.message));
  }, [load]);

  const openList = (list: JoyPickList) => {
    setActive(list);
    setPicked(Object.fromEntries(list.lines.map((line) => [line.productId, String(line.pickedQty || "")])));
  };

  const warehouseName = (id: string) => warehouses.find((row) => row.id === id)?.name ?? id;

  React.useEffect(() => {
    if (!active || active.status !== "TRANSFERRED") {
      setTally([]);
      return;
    }
    void fetchJoyPickListTally(active.id)
      .then((payload) => setTally(payload.lines ?? []))
      .catch(() => setTally([]));
  }, [active]);

  if (flowOn === null) {
    return (
      <PageShell>
        <PageHeader title="Route pick lists" />
      </PageShell>
    );
  }

  if (flowOn === false) {
    return (
      <PageShell>
        <PageHeader
          title="Route pick lists"
          description="Turn on Route dispatch under Sales document flow to use this for Joy. Other organisations keep their current pick and pack."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <style>{`@media print { body * { visibility: hidden; } #pick-print, #pick-print * { visibility: visible; } #pick-print { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } .print-blank { display: table-cell !important; } }`}</style>
      <PageHeader
        className="no-print"
        title="Route pick lists"
        description="One list for many approved sales orders. Saving the picked quantity does not move stock."
      />
      <div className="grid gap-4 p-4 no-print lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New pick list</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div>
                <Label>Vehicle number</Label>
                <Input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} />
              </div>
              <div>
                <Label>Route</Label>
                {routes.length ? (
                  <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={routeName} onChange={(event) => setRouteName(event.target.value)}>
                    <option value="">Choose a route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.name}>{route.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input value={routeName} onChange={(event) => setRouteName(event.target.value)} placeholder="Route name" />
                )}
              </div>
              <div>
                <Label>Destination warehouse</Label>
                <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)}>
                  <option value="">Choose a store</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.code ? `${warehouse.code} — ${warehouse.name}` : warehouse.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="max-h-48 space-y-1 overflow-auto rounded border p-2 text-sm">
              {orders.map((order) => (
                <label key={order.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={(event) => {
                      setSelectedOrders((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id));
                    }}
                  />
                  <span>{order.number}</span>
                  <span className="text-muted-foreground">{order.lineCount ?? 0} lines</span>
                </label>
              ))}
              {!orders.length ? <p className="text-muted-foreground">No approved sales orders are waiting.</p> : null}
            </div>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const created = await createJoyPickList({ salesOrderIds: selectedOrders, date, routeName, vehicleNumber, toWarehouseId });
                  toast.success(`Pick list ${created.number ?? ""} created.`);
                  setSelectedOrders([]);
                  await load();
                  openList(created);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not create the pick list");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create pick list
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saved lists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lists.map((list) => (
              <button key={list.id} type="button" className="flex w-full items-center justify-between rounded border px-3 py-2 text-left" onClick={() => openList(list)}>
                <span>{list.number} · {list.routeName} · {list.vehicleNumber}</span>
                <span className="text-muted-foreground">{list.status}</span>
              </button>
            ))}
            {!lists.length ? <p className="text-muted-foreground">No pick lists yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      {active ? (
        <div id="pick-print" className="space-y-4 p-4">
          <div>
            <h2 className="text-lg font-semibold">{active.number}</h2>
            <p className="text-sm">Date {new Date(active.date).toLocaleDateString("en-KE")} · Route {active.routeName} · Vehicle {active.vehicleNumber}</p>
            <p className="text-sm">From {warehouseName(active.fromWarehouseId)} to {warehouseName(active.toWarehouseId)}</p>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Product</th>
                <th>Ordered</th>
                <th className="no-print">Picked</th>
                <th className="hidden print-blank">Picked</th>
              </tr>
            </thead>
            <tbody>
              {active.lines.map((line) => (
                <tr key={line.productId} className="border-b">
                  <td className="py-2">{line.name}</td>
                  <td>{line.orderedQty}</td>
                  <td className="no-print">
                    <Input
                      className="h-8 w-24"
                      value={picked[line.productId] ?? ""}
                      onChange={(event) => setPicked((current) => ({ ...current, [line.productId]: event.target.value }))}
                    />
                  </td>
                  <td className="hidden h-8 print-blank" />
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" onClick={() => window.print()}>Print sheet</Button>
            <Button
              disabled={busy || active.status === "TRANSFERRED"}
              onClick={async () => {
                setBusy(true);
                try {
                  const saved = await saveJoyPickedQuantities(active.id, active.lines.map((line) => ({
                    productId: line.productId,
                    pickedQty: Number(picked[line.productId] || 0),
                  })));
                  setActive(saved);
                  toast.success("Picked quantities saved. Stock has not moved.");
                  await load();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save picked qty
            </Button>
            <Button
              disabled={busy || active.status === "TRANSFERRED"}
              onClick={async () => {
                setBusy(true);
                try {
                  await verifyJoyPickList(active.id);
                  toast.success("Transferred and dispatch note created.");
                  await load();
                  setActive((current) => current ? { ...current, status: "TRANSFERRED" } : current);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Transfer failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Verify and transfer
            </Button>
          </div>
          {active.status === "TRANSFERRED" ? (
            <div className="grid gap-4 no-print md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Short</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={shortProductId} onChange={(event) => setShortProductId(event.target.value)}>
                    <option value="">Product</option>
                    {active.lines.map((line) => <option key={line.productId} value={line.productId}>{line.name}</option>)}
                  </select>
                  <Input placeholder="Quantity" value={shortQty} onChange={(event) => setShortQty(event.target.value)} />
                  <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={whereNow} onChange={(event) => setWhereNow(event.target.value)}>
                    <option value="">Where are the goods now?</option>
                    {JOY_WHERE_NOW.map((place) => <option key={place} value={place}>{place}</option>)}
                  </select>
                  <Button onClick={async () => {
                    try {
                      await recordJoyShort(active.id, { productId: shortProductId, quantity: Number(shortQty), whereNow });
                      toast.success("Short put back, with where the goods are now.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not record the short");
                    }
                  }}>Record short</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Damaged return</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={damageProductId} onChange={(event) => setDamageProductId(event.target.value)}>
                    <option value="">Product</option>
                    {active.lines.map((line) => <option key={line.productId} value={line.productId}>{line.name}</option>)}
                  </select>
                  <Input placeholder="Quantity" value={damageQty} onChange={(event) => setDamageQty(event.target.value)} />
                  <Input placeholder="Reason" value={damageReason} onChange={(event) => setDamageReason(event.target.value)} />
                  <select className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={damageWarehouseId} onChange={(event) => setDamageWarehouseId(event.target.value)}>
                    <option value="">DISPATCH</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.code ? `${warehouse.code} — ${warehouse.name}` : warehouse.name}</option>
                    ))}
                  </select>
                  <Button onClick={async () => {
                    try {
                      await recordJoyDamage(active.id, {
                        lines: [{ productId: damageProductId, quantity: Number(damageQty) }],
                        reason: damageReason,
                        toWarehouseId: damageWarehouseId || undefined,
                      });
                      toast.success("Damaged goods transferred back to DISPATCH.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not record the return");
                    }
                  }}>Return to DISPATCH</Button>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Load tally</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left"><th>Product</th><th>Picked</th><th>Invoice</th><th>Delivery note</th><th>Short</th><th>Gap</th></tr>
                    </thead>
                    <tbody>
                      {tally.map((line) => (
                        <tr key={line.productId} className="border-t">
                          <td>{line.name}</td>
                          <td>{line.picked}</td>
                          <td>{line.invoiceQty}</td>
                          <td>{line.deliveryQty}</td>
                          <td>{line.shortQty}</td>
                          <td>{line.gap === 0 ? "Recorded" : line.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tally.some((line) => line.gap !== 0) ? (
                    <p className="mt-2 text-sm text-muted-foreground">A gap has to be recorded as a short or a damaged return.</p>
                  ) : null}
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Email dispatch note</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Input className="max-w-sm" type="email" placeholder="Email address" value={emailTo} onChange={(event) => setEmailTo(event.target.value)} />
                  <Button onClick={async () => {
                    try {
                      await emailJoyDispatchNote(active.id, emailTo);
                      toast.success(`Dispatch note sent to ${emailTo}`);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Email failed");
                    }
                  }}>Send</Button>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}

      <Card className="m-4 no-print">
        <CardHeader><CardTitle>Warehouse movement summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <select className="flex h-9 rounded-md border bg-background px-3 text-sm" value={summaryWarehouseId} onChange={(event) => setSummaryWarehouseId(event.target.value)}>
              <option value="">Warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
            <Input type="date" value={summaryFrom} onChange={(event) => setSummaryFrom(event.target.value)} />
            <Input type="date" value={summaryTo} onChange={(event) => setSummaryTo(event.target.value)} />
            <Button onClick={async () => {
              try {
                const next = await fetchJoyMovementSummary(summaryWarehouseId, summaryFrom, summaryTo);
                setSummary(next);
                setSummaryReason(next.reason || "");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not load the summary");
              }
            }}>Show</Button>
          </div>
          {summary ? (
            <div className="space-y-2 text-sm">
              <p>On hand {summary.onHand}. In {summary.inbound.length} movements, out {summary.outbound.length}.</p>
              <table className="w-full">
                <thead><tr className="text-left"><th>Direction</th><th>Type</th><th>Product</th><th>Qty</th><th>Other side</th></tr></thead>
                <tbody>
                  {[...summary.inbound.map((row) => ({ ...row, direction: "In" })), ...summary.outbound.map((row) => ({ ...row, direction: "Out" }))].map((row, index) => (
                    <tr key={`${row.direction}-${index}`} className="border-t">
                      <td>{row.direction}</td>
                      <td>{row.type}</td>
                      <td>{row.productId}</td>
                      <td>{row.quantity}</td>
                      <td>{row.otherSide || row.reference || row.documentType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.onHand > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Input className="max-w-md" placeholder="Warehouse manager reason for remaining stock" value={summaryReason} onChange={(event) => setSummaryReason(event.target.value)} />
                  <Button onClick={async () => {
                    try {
                      await reviewJoyMovementSummary({ warehouseId: summaryWarehouseId, from: summaryFrom, to: summaryTo, reason: summaryReason });
                      toast.success("Summary reviewed.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not review");
                    }
                  }}>Review</Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Nothing remains on hand, so no reason is required.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
