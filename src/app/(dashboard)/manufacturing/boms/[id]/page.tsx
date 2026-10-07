"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BomComponentEditor } from "@/components/manufacturing/bom-component-editor";
import {
  fetchManufacturingBom,
  fetchManufacturingRoutes,
  updateManufacturingBom,
  deleteManufacturingBom,
  type ManufacturingBom,
  type ManufacturingRoute,
} from "@/lib/api/manufacturing";
import { fetchWarehousesApi } from "@/lib/api/warehouses";
import { listUoms } from "@/lib/data/uom.repo";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function BomDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const id = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();
  const router = useRouter();
  const canWrite = useCanWriteManufacturing();
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const uoms = React.useMemo(() => listUoms().map((item) => item.code), []);
  const [bom, setBom] = React.useState<ManufacturingBom | null>(null);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; code?: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [togglingActive, setTogglingActive] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [nextBom, nextRoutes, nextWarehouses] = await Promise.all([
        fetchManufacturingBom(id),
        fetchManufacturingRoutes(),
        fetchWarehousesApi().catch(() => []),
      ]);
      setBom(nextBom);
      setRoutes(nextRoutes);
      setWarehouses(nextWarehouses.filter((warehouse) => warehouse.status !== "INACTIVE"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load BOM.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleToggleActive() {
    if (!bom) return;
    setTogglingActive(true);
    try {
      const updated = await updateManufacturingBom(bom.id, { isActive: !bom.isActive });
      setBom(updated);
      toast.success(updated.isActive ? "BOM activated." : "BOM deactivated — it will no longer appear in the subcontracting picker.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update BOM status.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleDelete() {
    if (!bom) return;
    setDeleting(true);
    try {
      await deleteManufacturingBom(bom.id);
      toast.success(`BOM ${bom.code} deleted.`);
      router.push("/manufacturing/boms");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cannot delete BOM.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading && !bom) {
    return (
      <PageShell>
        <PageHeader title="Loading BOM..." breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: "BOMs" }]} />
      </PageShell>
    );
  }

  if (!bom) {
    return (
      <PageShell>
        <PageHeader title="BOM not found" breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: "BOMs" }]} />
        <div className="p-6">
          <p className="text-muted-foreground">This BOM could not be loaded from the backend.</p>
        </div>
      </PageShell>
    );
  }

  const selectedRoute = routes.find((route) => route.id === bom.routeId);

  return (
    <PageShell>
      <PageHeader
        title={`${bom.code} - ${bom.name}`}
        description={`${bom.quantity} ${bom.uom} output for ${bom.finishedProductSku ? `${bom.finishedProductSku} - ${bom.finishedProductName}` : bom.finishedProductName ?? bom.finishedProductId}`}
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "BOMs", href: "/manufacturing/boms" },
          { label: bom.code },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={bom.type === "formula" ? "secondary" : bom.type === "disassembly" ? "default" : "outline"}>
              {bom.type === "disassembly" ? "Disassembly" : bom.type === "formula" ? "Formula" : "BOM"}
            </Badge>
            <Badge variant={bom.isActive ? "outline" : "secondary"}>
              {bom.isActive ? "Active" : "Inactive"}
            </Badge>
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                disabled={togglingActive}
                onClick={handleToggleActive}
              >
                {togglingActive
                  ? "Saving…"
                  : bom.isActive
                  ? "Deactivate"
                  : "Activate"}
              </Button>
            )}
            {canWrite && (confirmDelete ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Icons.Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            ))}
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/boms">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Components</CardTitle>
            <CardDescription>
              Search and add products, then set quantity, unit, store, and scrap on each row. A draft is kept so you can leave and continue. Save components when the list is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <BomComponentEditor
              bomId={bom.id}
              savedItems={bom.items}
              uoms={uoms}
              warehouses={warehouses}
              canWrite={canWrite}
              onSaved={setBom}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Routing link</CardTitle>
            <CardDescription>Assign the live routing used when this BOM is converted into production work orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Route</Label>
              <Select
                disabled={!canWrite}
                value={bom.routeId ?? "__none__"}
                onValueChange={async (value) => {
                  try {
                    const updated = await updateManufacturingBom(bom.id, {
                      routeId: value === "__none__" ? undefined : value,
                    });
                    setBom(updated);
                    toast.success("Routing link updated.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to update route.");
                  }
                }}
              >
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No route</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.code} - {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRoute && (
              <p className="text-sm text-muted-foreground">
                Assigned route: `{selectedRoute.code}` with {selectedRoute.operations.length} operation(s).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
