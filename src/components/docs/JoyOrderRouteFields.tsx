"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import type { CollectionRoute } from "@/lib/api/joy-route-orders";
import { SfaSalesRepSelect, type PickedSalesRep } from "@/components/sales/SfaSalesRepPicker";

const selectClass = "block min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm";
const DISPATCH_DEFAULT = "__dispatch__";

export type RouteSourceStore = { id: string; label: string };

function matching<T extends AsyncSearchableSelectOption>(options: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
}

export function JoyOrderRouteFields(props: {
  date: string;
  onDateChange: (value: string) => void;
  routes: CollectionRoute[];
  route?: CollectionRoute;
  savedRoute?: boolean;
  onRouteChange: (value: string) => void;
  salesRep: PickedSalesRep | null;
  onSalesRepChange: (value: PickedSalesRep | null) => void;
  tillNumber: string;
  onTillChange: (value: string) => void;
  sourceStores: RouteSourceStore[];
  sourceStoreId: string;
  onSourceStoreChange: (value: string) => void;
  dispatchStoreLabel: string;
  loading: boolean;
  error?: string;
  hasCustomer: boolean;
  /** Edit hides the standing explanations under the fields. */
  captions?: boolean;
}) {
  const {
    date, onDateChange, routes, route, savedRoute, onRouteChange, salesRep, onSalesRepChange, tillNumber, onTillChange,
    sourceStores, sourceStoreId, onSourceStoreChange, dispatchStoreLabel, loading, error, hasCustomer, captions = true,
  } = props;
  const tills = [...new Set(route?.collectors.map((row) => row.tillNumber).filter(Boolean))];

  const routeOptions = React.useMemo<AsyncSearchableSelectOption[]>(
    () => routes.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.collectors.length ? undefined : "No till configured",
    })),
    [routes],
  );
  const dispatchOption = React.useMemo<AsyncSearchableSelectOption>(
    () => ({ id: DISPATCH_DEFAULT, label: `${dispatchStoreLabel} (default)`, description: "The dispatch store route trucks load from." }),
    [dispatchStoreLabel],
  );
  const sourceOptions = React.useMemo<AsyncSearchableSelectOption[]>(
    () => sourceStores.filter((store) => store.id !== route?.id).map((store) => ({ id: store.id, label: store.label })),
    [sourceStores, route?.id],
  );
  const selectedSource = sourceOptions.find((option) => option.id === sourceStoreId) ?? dispatchOption;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="joy-delivery-date">Delivery date</Label>
        <Input id="joy-delivery-date" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-delivery-route">Route warehouse</Label>
        <AsyncSearchableSelect
          id="joy-delivery-route"
          value={route?.id ?? ""}
          selectedOption={route ? { id: route.id, label: route.name } : null}
          onValueChange={onRouteChange}
          loadOptions={async (query) => matching(routeOptions, query)}
          reloadToken={routeOptions.length}
          searchDebounceMs={0}
          disabled={!hasCustomer || loading || !!error}
          placeholder="Select route warehouse"
          searchPlaceholder="Find a route"
          emptyMessage="No route matches."
          wrapLabels
          minDropdownWidth={300}
        />
        {captions ? (
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading delivery routes…" : error ? error : !hasCustomer ? "Choose a customer first." : !date ? "Choose a delivery date."
              : !routes.length ? "Create a route store to continue."
                : route && !route.collectors.length ? "This route has no till configured. You can still save the order."
                  : savedRoute ? "The saved weekday route is suggested. Changes here apply to this order."
                  : "The first route you save for this outlet and weekday becomes its default."}
          </p>
        ) : error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-source-store">Pick from store</Label>
        <AsyncSearchableSelect
          id="joy-source-store"
          value={sourceStoreId || DISPATCH_DEFAULT}
          selectedOption={selectedSource}
          onValueChange={(next) => onSourceStoreChange(next === DISPATCH_DEFAULT ? "" : next)}
          loadOptions={async (query) => (query.trim() ? matching(sourceOptions, query) : [dispatchOption, ...sourceOptions])}
          reloadToken={`${sourceOptions.length}:${route?.id ?? ""}`}
          searchDebounceMs={0}
          placeholder={dispatchOption.label}
          searchPlaceholder="Find a store"
          emptyMessage="No store matches."
          wrapLabels
          minDropdownWidth={300}
        />
      </div>
      <div className="hidden sm:block" aria-hidden />
      <div className="space-y-1">
        <Label htmlFor="joy-sales-rep">Sales rep</Label>
        <SfaSalesRepSelect id="joy-sales-rep" value={salesRep} onChange={onSalesRepChange} disabled={!route} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-till-number">M-Pesa till</Label>
        <select id="joy-till-number" className={selectClass} value={tills.includes(tillNumber) ? tillNumber : ""} disabled={!tills.length}
          onChange={(e) => onTillChange(e.target.value)}>
          <option value="">{tills.length ? "Select till" : "No till on this route"}</option>
          {tills.map((till) => <option key={till} value={till}>{till}</option>)}
        </select>
      </div>
    </div>
  );
}
