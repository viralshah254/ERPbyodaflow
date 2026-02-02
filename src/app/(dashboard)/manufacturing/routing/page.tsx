"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listWorkCenters,
  createWorkCenter,
  updateWorkCenter,
  deleteWorkCenter,
  listRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  listRouteOperations,
  saveRouteOperations,
  createRouteOperation,
  updateRouteOperation,
  deleteRouteOperation,
  resetRoutingFromMocks,
} from "@/lib/data/routing.repo";
import type { WorkCenter, RouteRow, RouteOperation } from "@/lib/manufacturing/types";
import * as Icons from "lucide-react";

function RoutingContent() {
  const searchParams = useSearchParams();
  const routeId = searchParams.get("route") ?? "";

  const [workCenters, setWorkCenters] = React.useState<WorkCenter[]>([]);
  const [routes, setRoutes] = React.useState<RouteRow[]>([]);
  const [wcSheetOpen, setWcSheetOpen] = React.useState(false);
  const [routeSheetOpen, setRouteSheetOpen] = React.useState(false);
  const [opSheetOpen, setOpSheetOpen] = React.useState(false);
  const [editingWc, setEditingWc] = React.useState<WorkCenter | null>(null);
  const [editingRoute, setEditingRoute] = React.useState<RouteRow | null>(null);
  const [editingOp, setEditingOp] = React.useState<RouteOperation | null>(null);
  const [selectedRouteId, setSelectedRouteId] = React.useState(routeId);
  const [ops, setOps] = React.useState<RouteOperation[]>([]);

  const refresh = React.useCallback(() => {
    setWorkCenters(listWorkCenters());
    setRoutes(listRoutes());
  }, []);
  React.useEffect(() => refresh(), [refresh]);

  React.useEffect(() => {
    setSelectedRouteId((prev) => routeId || prev);
  }, [routeId]);

  React.useEffect(() => {
    if (!selectedRouteId) return;
    setOps(listRouteOperations(selectedRouteId));
  }, [selectedRouteId, routes, workCenters]);

  const selectedRoute = selectedRouteId ? getRouteById(selectedRouteId) : null;
  const wcMap = React.useMemo(() => new Map(workCenters.map((w) => [w.id, w])), [workCenters]);

  return (
    <PageShell>
      <PageHeader
        title="Routing"
        description="Work centers, routes, and operations. Stub for production order sequencing."
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Routing" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { resetRoutingFromMocks(); refresh(); }}>
              Reset to defaults
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/boms">BOMs</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work centers</CardTitle>
              <CardDescription>Mixing, packing, QC, etc.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workCenters.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono font-medium">{w.code}</TableCell>
                      <TableCell>{w.name}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingWc(w); setWcSheetOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteWorkCenter(w.id); refresh(); }}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Button size="sm" onClick={() => { setEditingWc(null); setWcSheetOpen(true); }}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add work center
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Routes</CardTitle>
              <CardDescription>Sequence of operations. Link from formula BOMs.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedRouteId(r.id); setEditingRoute(r); setRouteSheetOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRouteId(r.id)}>View ops</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteRoute(r.id); refresh(); if (selectedRouteId === r.id) setSelectedRouteId(""); }}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Button size="sm" onClick={() => { setEditingRoute(null); setRouteSheetOpen(true); }}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add route
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedRoute && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operations — {selectedRoute.name}</CardTitle>
              <CardDescription>Sequence, work center, setup & run times.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seq</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Work center</TableHead>
                    <TableHead>Setup (min)</TableHead>
                    <TableHead>Run (min/unit)</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono">{o.sequence}</TableCell>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{wcMap.get(o.workCenterId)?.name ?? o.workCenterId}</TableCell>
                      <TableCell>{o.setupMinutes}</TableCell>
                      <TableCell>{o.runMinutesPerUnit}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingOp(o); setOpSheetOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteRouteOperation(selectedRouteId, o.id); setOps(listRouteOperations(selectedRouteId)); }}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Button size="sm" onClick={() => { setEditingOp(null); setOpSheetOpen(true); }}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add operation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {routes.length > 0 && !selectedRouteId && (
          <p className="text-sm text-muted-foreground">Select a route (View ops) to see or edit operations.</p>
        )}
      </div>

      {wcSheetOpen && (
        <WorkCenterSheet
          initial={editingWc}
          onSave={(row) => {
            if (editingWc) updateWorkCenter(editingWc.id, row);
            else createWorkCenter(row);
            refresh();
            setWcSheetOpen(false);
          }}
          onClose={() => { setWcSheetOpen(false); setEditingWc(null); }}
        />
      )}
      {routeSheetOpen && (
        <RouteSheet
          initial={editingRoute}
          onSave={(row) => {
            if (editingRoute) updateRoute(editingRoute.id, row);
            else createRoute(row);
            refresh();
            setRouteSheetOpen(false);
          }}
          onClose={() => { setRouteSheetOpen(false); setEditingRoute(null); }}
        />
      )}
      {opSheetOpen && selectedRouteId && (
        <OperationSheet
          routeId={selectedRouteId}
          workCenters={workCenters}
          initial={editingOp}
          onSave={(row) => {
            if (editingOp) {
              updateRouteOperation(selectedRouteId, editingOp.id, row);
            } else {
              createRouteOperation(selectedRouteId, row);
            }
            setOps(listRouteOperations(selectedRouteId));
            setOpSheetOpen(false);
          }}
          onClose={() => { setOpSheetOpen(false); setEditingOp(null); }}
        />
      )}
    </PageShell>
  );
}

function WorkCenterSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: WorkCenter | null;
  onSave: (row: Omit<WorkCenter, "id">) => void;
  onClose: () => void;
}) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");

  React.useEffect(() => {
    if (initial) {
      setCode(initial.code);
      setName(initial.name);
      setDescription(initial.description ?? "");
    }
  }, [initial]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit work center" : "Add work center"}</SheetTitle>
          <SheetDescription>Code, name, optional description.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WC-MIX" required />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mixing" required />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Raw material mixing" />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ code: code.trim(), name: name.trim(), description: description.trim() || undefined })}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RouteSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: RouteRow | null;
  onSave: (row: Omit<RouteRow, "id">) => void;
  onClose: () => void;
}) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");

  React.useEffect(() => {
    if (initial) {
      setCode(initial.code);
      setName(initial.name);
      setDescription(initial.description ?? "");
    }
  }, [initial]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit route" : "Add route"}</SheetTitle>
          <SheetDescription>Code, name, optional description.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="R-GAMMA" required />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gamma Production" required />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ code: code.trim(), name: name.trim(), description: description.trim() || undefined })}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function OperationSheet({
  routeId,
  workCenters,
  initial,
  onSave,
  onClose,
}: {
  routeId: string;
  workCenters: WorkCenter[];
  initial: RouteOperation | null;
  onSave: (row: Omit<RouteOperation, "id" | "routeId">) => void;
  onClose: () => void;
}) {
  const ops = listRouteOperations(routeId);
  const nextSeq = initial ? initial.sequence : (ops.length ? Math.max(...ops.map((o) => o.sequence)) + 10 : 10);

  const [sequence, setSequence] = React.useState(initial?.sequence ?? nextSeq);
  const [name, setName] = React.useState(initial?.name ?? "");
  const [workCenterId, setWorkCenterId] = React.useState(initial?.workCenterId ?? workCenters[0]?.id ?? "");
  const [setupMinutes, setSetupMinutes] = React.useState(initial?.setupMinutes ?? 0);
  const [runMinutesPerUnit, setRunMinutesPerUnit] = React.useState(initial?.runMinutesPerUnit ?? 0);

  React.useEffect(() => {
    if (initial) {
      setSequence(initial.sequence);
      setName(initial.name);
      setWorkCenterId(initial.workCenterId);
      setSetupMinutes(initial.setupMinutes);
      setRunMinutesPerUnit(initial.runMinutesPerUnit);
    } else {
      setSequence(nextSeq);
    }
  }, [initial, nextSeq]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit operation" : "Add operation"}</SheetTitle>
          <SheetDescription>Sequence, work center, setup & run times.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Sequence</Label>
            <Input type="number" min={0} value={sequence} onChange={(e) => setSequence(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mix" required />
          </div>
          <div className="space-y-2">
            <Label>Work center</Label>
            <Select value={workCenterId} onValueChange={setWorkCenterId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {workCenters.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Setup (min)</Label>
              <Input type="number" min={0} value={setupMinutes} onChange={(e) => setSetupMinutes(Number((e.target as HTMLInputElement).value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Run (min/unit)</Label>
              <Input type="number" min={0} step={0.01} value={runMinutesPerUnit} onChange={(e) => setRunMinutesPerUnit(Number((e.target as HTMLInputElement).value) || 0)} />
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ sequence, name: name.trim(), workCenterId, setupMinutes, runMinutesPerUnit })}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function RoutingPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PageHeader title="Routing" description="Loading…" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/boms" }, { label: "Routing" }]} />
          <div className="p-6">Loading…</div>
        </PageShell>
      }
    >
      <RoutingContent />
    </Suspense>
  );
}
