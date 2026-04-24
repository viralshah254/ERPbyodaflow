"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createManufacturingRoute,
  fetchManufacturingRoutes,
  updateManufacturingRoute,
  type ManufacturingRoute,
} from "@/lib/api/manufacturing";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type RouteOperationInput = {
  id: string;
  sequence: string;
  name: string;
  workCenter: string;
  setupMinutes: string;
  runMinutesPerUnit: string;
};

export default function RoutingPage() {
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<ManufacturingRoute | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [operations, setOperations] = React.useState<RouteOperationInput[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextRoutes = await fetchManufacturingRoutes();
      setRoutes(nextRoutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load routing.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function openRoute(route?: ManufacturingRoute) {
    setEditingRoute(route ?? null);
    setCode(route?.code ?? "");
    setName(route?.name ?? "");
    setDescription(route?.description ?? "");
    setOperations(
      (route?.operations ?? []).map((operation) => ({
        id: operation.id,
        sequence: String(operation.sequence),
        name: operation.name,
        workCenter: operation.workCenter ?? operation.workCenterId ?? "",
        setupMinutes: String(operation.setupMinutes ?? 0),
        runMinutesPerUnit: String(operation.runMinutesPerUnit ?? 0),
      }))
    );
    setSheetOpen(true);
  }

  function addOperation() {
    setOperations((current) => [
      ...current,
      {
        id: `op-${Date.now()}`,
        sequence: String(current.length + 1),
        name: "",
        workCenter: "",
        setupMinutes: "0",
        runMinutesPerUnit: "0",
      },
    ]);
  }

  return (
    <PageShell>
      <PageHeader
        title="Routing"
        description="Live operation sequences used by manufacturing BOMs and work orders."
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Routing" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/boms">BOMs</Link>
            </Button>
            <Button size="sm" onClick={() => openRoute()}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New route
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Routes</CardTitle>
            <CardDescription>Each route can define multiple operations with work center and time standards.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Operations</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.code}</TableCell>
                    <TableCell>{route.name}</TableCell>
                    <TableCell>{route.operations.length}</TableCell>
                    <TableCell>{route.description ?? "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openRoute(route)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!loading && routes.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No routes yet.</div>
            )}
            {loading && <div className="p-6 text-sm text-muted-foreground">Loading routes...</div>}
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingRoute ? "Edit route" : "New route"}</SheetTitle>
            <SheetDescription>Define the operation sequence, work centers, and timing standards.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="RT-001" />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Filleting route" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Operations</Label>
                <Button size="sm" variant="outline" onClick={addOperation}>
                  Add operation
                </Button>
              </div>
              {operations.map((operation, index) => (
                <div key={operation.id} className="rounded-md border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Sequence</Label>
                      <Input
                        value={operation.sequence}
                        onChange={(e) =>
                          setOperations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, sequence: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={operation.name}
                        onChange={(e) =>
                          setOperations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, name: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Work center</Label>
                      <Input
                        value={operation.workCenter}
                        onChange={(e) =>
                          setOperations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, workCenter: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Setup minutes</Label>
                      <Input
                        value={operation.setupMinutes}
                        onChange={(e) =>
                          setOperations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, setupMinutes: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Run min/unit</Label>
                      <Input
                        value={operation.runMinutesPerUnit}
                        onChange={(e) =>
                          setOperations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, runMinutesPerUnit: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setOperations((current) => current.filter((item) => item.id !== operation.id))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {operations.length === 0 && (
                <p className="text-sm text-muted-foreground">No operations defined yet. Add at least one step for execution planning.</p>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={saving || !name.trim()}
              onClick={async () => {
                setSaving(true);
                try {
                  const payload = {
                    code: code.trim(),
                    name: name.trim(),
                    description: description.trim() || undefined,
                    operations: operations.map((operation) => ({
                      id: operation.id,
                      sequence: Number(operation.sequence) || 0,
                      name: operation.name.trim(),
                      workCenter: operation.workCenter.trim(),
                      setupMinutes: Number(operation.setupMinutes) || 0,
                      runMinutesPerUnit: Number(operation.runMinutesPerUnit) || 0,
                    })),
                  };
                  if (editingRoute) {
                    await updateManufacturingRoute(editingRoute.id, payload);
                  } else {
                    await createManufacturingRoute(payload);
                  }
                  toast.success(`Route ${editingRoute ? "updated" : "created"}.`);
                  setSheetOpen(false);
                  await refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to save route.");
                } finally {
                  setSaving(false);
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
