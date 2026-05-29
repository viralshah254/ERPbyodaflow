"use client";

import * as React from "react";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createDistributionRoute, fetchDistributionRoutes, type DistributionRouteRow } from "@/lib/api/distribution";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DistributionRoutesPage() {
  const terminology = useTerminology();
  const routeLabel = t("route", terminology);
  const [rows, setRows] = React.useState<Array<DistributionRouteRow & { schedule: string; outlets: number; status: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [stops, setStops] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDistributionRoutes();
      setRows(items.map((item) => ({
        ...item,
        schedule: item.description ?? "Operational",
        outlets: item.stops?.length ?? 0,
        status: "Active",
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load routes.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const columns = [
    { id: "name", header: "Name", accessor: (r: (typeof rows)[number]) => <span className="font-medium">{r.name}</span>, sticky: true },
    { id: "schedule", header: "Description", accessor: "schedule" as keyof (typeof rows)[number] },
    { id: "outlets", header: "Stops", accessor: "outlets" as keyof (typeof rows)[number] },
    { id: "status", header: "Status", accessor: "status" as keyof (typeof rows)[number] },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={`${routeLabel}s`}
        description="Route list and schedule"
        sticky
        showCommandHint
        actions={
          <Button onClick={() => setSheetOpen(true)}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            New route
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Routes</h3>
          </div>
          <DataTable
            data={rows}
            columns={columns}
            emptyMessage={loading ? "Loading routes..." : "No routes."}
            scrollMode="fill"
            size="comfortable"
            className="min-h-0 flex-1 border-0"
          />
        </div>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New route</SheetTitle>
            <SheetDescription>Create a live distributor route with named stops.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stops</Label>
              <Input value={stops} onChange={(e) => setStops(e.target.value)} placeholder="One stop, Two stop, Three stop" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  await createDistributionRoute({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    stops: stops.split(",").map((item) => item.trim()).filter(Boolean),
                  });
                  toast.success("Route created.");
                  setSheetOpen(false);
                  setName("");
                  setDescription("");
                  setStops("");
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create route.");
                }
              }}
            >
              Save route
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
