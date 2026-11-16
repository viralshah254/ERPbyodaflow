"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJoyCollectionRoutes, saveJoyCollectionRoute, type CollectionRoute, type RouteCollector, type RouteSalesRep } from "@/lib/api/joy-route-orders";

export function JoyRouteCollectors({ canWrite }: { canWrite: boolean }) {
  const [routes, setRoutes] = React.useState<CollectionRoute[]>([]);
  const [reps, setReps] = React.useState<RouteSalesRep[]>([]);
  const [routeId, setRouteId] = React.useState("");
  const [collectors, setCollectors] = React.useState<RouteCollector[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchJoyCollectionRoutes()
      .then((data) => {
        if (!active) return;
        setRoutes(data.routes);
        setReps(data.reps);
      })
      .catch(() => { if (active) toast.error("Route collection settings could not load."); });
    return () => { active = false; };
  }, []);

  async function save() {
    setBusy(true);
    try {
      const saved = await saveJoyCollectionRoute(routeId, collectors);
      setRoutes((previous) => previous.map((route) => route.id === saved.id ? saved : route));
      setCollectors(saved.collectors);
      toast.success("Sales reps and tills saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save route collections.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Route sales reps and tills</h2>
      <Label htmlFor="collection-route">Route warehouse</Label>
      <select id="collection-route" className="block min-h-10 w-full max-w-xl rounded-md border bg-background px-3 py-2 text-sm"
        value={routeId} disabled={busy} onChange={(event) => {
          const selected = routes.find((route) => route.id === event.target.value);
          setRouteId(selected?.id ?? "");
          setCollectors(selected?.collectors ?? []);
        }}>
        <option value="">Select route warehouse</option>
        {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
      </select>
      {routeId && (
        <>
          <p className="text-sm text-muted-foreground">The first assignment is suggested on new orders. Add a row for each rep and till that can collect on this route.</p>
          {collectors.map((row, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select aria-label={`Sales rep ${index + 1}`} className="min-h-10 w-56 rounded-md border bg-background px-3 text-sm"
                value={row.salesRepId} disabled={!canWrite || busy}
                onChange={(event) => {
                  const rep = reps.find((rep) => rep.id === event.target.value);
                  setCollectors((rows) => rows.map((item, i) => i === index
                    ? { ...item, salesRepId: rep?.id ?? "", salesRep: rep?.name ?? "" } : item));
                }}>
                <option value="">Select sales rep</option>
                {row.salesRepId && !reps.some((rep) => rep.id === row.salesRepId) && (
                  <option value={row.salesRepId}>{row.salesRep} (inactive)</option>
                )}
                {reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name} · {rep.code}</option>)}
              </select>
              <Input aria-label={`Till ${index + 1}`} placeholder="M-Pesa till" inputMode="numeric" className="w-36"
                value={row.tillNumber} disabled={!canWrite || busy}
                onChange={(e) => setCollectors((rows) => rows.map((item, i) => i === index ? { ...item, tillNumber: e.target.value } : item))} />
              {canWrite && <Button variant="ghost" size="sm" disabled={busy}
                onClick={() => setCollectors((rows) => rows.filter((_, i) => i !== index))}>Remove</Button>}
            </div>
          ))}
          {canWrite && (
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setCollectors((rows) => [...rows, { salesRepId: "", salesRep: "", tillNumber: "" }])}>
                Add assignment
              </Button>
              <Button disabled={busy} onClick={() => void save()}>Save assignments</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
