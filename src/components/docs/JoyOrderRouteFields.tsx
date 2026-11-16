"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { CollectionRoute, RouteCollector } from "@/lib/api/joy-route-orders";

const selectClass = "block min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm";
const collectorKey = ({ salesRepId, tillNumber }: RouteCollector) => JSON.stringify([salesRepId, tillNumber]);

export function JoyOrderRouteFields(props: {
  date: string;
  onDateChange: (value: string) => void;
  routes: CollectionRoute[];
  route?: CollectionRoute;
  savedRoute?: boolean;
  onRouteChange: (value: string) => void;
  collector?: RouteCollector;
  onCollectorChange: (value?: RouteCollector) => void;
  loading: boolean;
  error?: string;
  hasCustomer: boolean;
}) {
  const { date, onDateChange, routes, route, savedRoute, onRouteChange, collector, onCollectorChange, loading, error, hasCustomer } = props;
  const reps = [...new Map(route?.collectors.map((row) => [row.salesRepId, row.salesRep])).entries()];
  const tills = route?.collectors.filter((row) => row.salesRepId === collector?.salesRepId) ?? [];

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="joy-delivery-date">Delivery date</Label>
        <Input id="joy-delivery-date" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-delivery-route">Route warehouse</Label>
        <select id="joy-delivery-route" className={selectClass} value={route?.id ?? ""} disabled={!hasCustomer || loading || !!error}
          onChange={(e) => onRouteChange(e.target.value)}>
          <option value="">Select route warehouse</option>
          {routes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading delivery routes…" : error ? error : !hasCustomer ? "Choose a customer first." : !date ? "Choose a delivery date."
            : !routes.length ? "Create a route store to continue."
              : route && !route.collectors.length ? "This route has no rep or till configured. You can still save the order."
                : savedRoute ? "The saved weekday route is suggested. Changes here apply to this order."
                : "The first route you save for this outlet and weekday becomes its default."}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-sales-rep">Sales rep</Label>
        <select id="joy-sales-rep" className={selectClass} value={collector?.salesRepId ?? ""} disabled={!reps.length}
          onChange={(e) => onCollectorChange(route?.collectors.find((row) => row.salesRepId === e.target.value))}>
          <option value="">Select sales rep</option>
          {reps.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-till-number">M-Pesa till</Label>
        <select id="joy-till-number" className={selectClass} value={collector ? collectorKey(collector) : ""} disabled={!tills.length}
          onChange={(e) => onCollectorChange(tills.find((row) => collectorKey(row) === e.target.value))}>
          <option value="">Select till</option>
          {tills.map((row) => <option key={collectorKey(row)} value={collectorKey(row)}>{row.tillNumber}</option>)}
        </select>
      </div>
    </div>
  );
}
