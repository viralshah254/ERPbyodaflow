"use client";

import React from "react";
import { ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import type { CollectionRoute } from "@/lib/api/joy-route-orders";
import { SfaSalesRepSelect, type PickedSalesRep } from "@/components/sales/SfaSalesRepPicker";

const selectClass = "block min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm";

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
  /** Set on orders saved before route stock: the store they still pick from. */
  legacyPickStoreLabel?: string | null;
  loading: boolean;
  error?: string;
  hasCustomer: boolean;
  /** Edit hides the standing explanations under the fields. */
  captions?: boolean;
}) {
  const {
    date, onDateChange, routes, route, savedRoute, onRouteChange, salesRep, onSalesRepChange, tillNumber, onTillChange,
    legacyPickStoreLabel, loading, error, hasCustomer, captions = true,
  } = props;
  const tills = [...new Set([
    salesRep?.tillNumber,
    tillNumber,
    ...(route?.collectors.map((row) => row.tillNumber) ?? []),
  ].filter(Boolean))];

  const routeOptions = React.useMemo<AsyncSearchableSelectOption[]>(
    () => routes.map((row) => ({
      id: row.id,
      label: row.name,
      description: row.collectors.length ? undefined : "No till configured",
    })),
    [routes],
  );
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
        {legacyPickStoreLabel ? (
          <p className="text-xs text-muted-foreground">
            Saved before route stock. Still picked from <span className="font-medium text-foreground">{legacyPickStoreLabel}</span>.
          </p>
        ) : route && captions ? (
          <p className="flex items-start gap-1.5 pt-0.5 text-xs text-muted-foreground">
            <ClipboardList className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>No stock needed to save. The route&rsquo;s loading note totals its orders and lists what to transfer.</span>
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-sales-rep">Sales rep</Label>
        <SfaSalesRepSelect id="joy-sales-rep" value={salesRep} onChange={onSalesRepChange} disabled={!route} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="joy-till-number">M-Pesa till</Label>
        <select id="joy-till-number" className={selectClass} value={tills.includes(tillNumber) ? tillNumber : ""} disabled={!tills.length}
          onChange={(e) => onTillChange(e.target.value)}>
          <option value="">{tills.length ? "Select till" : salesRep ? "No till for this sales rep" : "Select a sales rep first"}</option>
          {tills.map((till) => <option key={till} value={till}>{till}</option>)}
        </select>
      </div>
    </div>
  );
}
