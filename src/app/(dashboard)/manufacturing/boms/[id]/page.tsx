"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing, useHasPermission } from "@/lib/rbac/use-write-guard";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "lucide-react";

import { BomPilotHelp } from "@/components/manufacturing/BomPilotHelp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const templateId = useOrgContextStore((s) => s.templateId);
  const isPlant = ["fmcg-manufacturer", "fmcg-bakery", "bakex", "bakery"].includes(templateId ?? "");
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const uoms = React.useMemo(() => listUoms().map((item) => item.code), []);
  const [bom, setBom] = React.useState<ManufacturingBom | null>(null);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; code?: string; name: string }>>([]);
  const canApprove = useHasPermission("manufacturing.production.approve");
  const [section, setSection] = React.useState("components");
  const [tolerance, setTolerance] = React.useState("");
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
          <p className="text-muted-foreground">This BOM could not be loaded. It may be unavailable or the connection may have failed.</p>
          <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => void refresh()}>Retry loading BOM</Button><Button variant="ghost" asChild><Link href="/manufacturing/boms">Back to BOMs</Link></Button></div>
        </div>
      </PageShell>
    );
  }

  const editable = canWrite && !["EFFECTIVE", "RETIRED"].includes(bom.lifecycle ?? "") && (!isPlant || bom.lifecycle === "DRAFT");
  const saveTolerance = async () => {
    if (!bom || !tolerance || !Number.isFinite(Number(tolerance)) || Number(tolerance) < 0 || Number(tolerance) > 1000) return;
    try { const updated = await updateManufacturingBom(bom.id, { yieldTolerancePercent: Number(tolerance) }); setBom(updated); toast.success("Yield tolerance saved for future preparations"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save tolerance"); }
  };
  const selectedRoute = routes.find((route) => route.id === bom.routeId);

  return (
    <PageShell>
      <PageHeader
        title={`${bom.code} — ${bom.name}`}
        help={<BomPilotHelp screen="detail" steps={[
          { id: "summary", target: "[data-bom-summary]", title: "Check this recipe and revision", description: "Confirm the finished product, batch output and version before editing. Availability and revision lifecycle are separate: an active recipe is not necessarily an approved revision." },
          { id: "components", target: "[data-bom-tabs]", title: "Inspect the component list", description: editable ? "Open Components to review input products, quantities, units, source stores and scrap. The editor keeps a draft; Save components commits it. Adding or saving real lines is optional during this walkthrough." : "Open Components to inspect the inputs. This record is read-only for your access or lifecycle; the guide does not bypass that restriction.", instruction: "Select the Components tab.", complete: section === "components" },
          { id: "routing", target: "[data-bom-tabs]", title: "Review the production routing", description: "Select Routing to inspect the linked production operations. Changing the route saves immediately, so only change it when you intend to update this BOM.", instruction: "Select the Routing tab without changing the route.", complete: section === "routing" },
          { id: "review", target: "[data-bom-revisions]", title: "Continue with revision governance", description: "Review revisions opens recipe governance. Effective and retired recipes are locked here; plant recipes are editable only in draft with write access. Finish walkthrough records learning progress and leaves business data untouched." },
        ]} />}
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
            <Button variant="outline" size="sm" asChild><Link href="/manufacturing/recipe-governance" data-bom-revisions>Review revisions</Link></Button>
            {editable && !isPlant && (
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
            {editable && (confirmDelete ? (
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
      <div className="space-y-6 p-4 sm:p-6">
        <div data-bom-summary className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Finished product</p><p className="mt-1 font-medium">{bom.finishedProductName ?? bom.finishedProductId}</p><p className="text-xs font-mono text-muted-foreground">{bom.finishedProductSku}</p></div>
          <div><p className="text-xs text-muted-foreground">Batch output</p><p className="mt-1 text-xl font-semibold tabular-nums">{bom.quantity} <span className="text-sm font-normal text-muted-foreground">{bom.uom}</span></p></div>
          <div><p className="text-xs text-muted-foreground">Version and lifecycle</p><p className="mt-1 font-medium">Version {bom.version}</p><p className="text-xs text-muted-foreground">{bom.lifecycle || "No lifecycle assigned"}</p></div>
          <div><p className="text-xs text-muted-foreground">Components</p><p className="mt-1 text-xl font-semibold tabular-nums">{bom.items.length}</p><p className="text-xs text-muted-foreground">{editable ? "Editable recipe" : "Read-only for your access or lifecycle"}</p></div>
        </div>
        {!editable && <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">This recipe is read-only for your current access or revision lifecycle. Use Review revisions to inspect its governance.</p>}
        <Tabs value={section} onValueChange={setSection}>
        <TabsList data-bom-tabs aria-label="BOM record sections">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
        </TabsList>
        <TabsContent value="components" forceMount hidden={section !== "components"}>
        <Card>
          <CardHeader>
            <CardTitle>Components</CardTitle>
            <CardDescription>
              {editable ? "Search and add products, then set quantity, unit, store, and scrap on each row. A draft is kept so you can leave and continue. Save components when the list is ready." : "Review the input products, quantities, units, stores and scrap allowances. Component changes are unavailable for this record or your current access."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {canApprove && editable && <div className="flex flex-wrap items-end gap-3 border-b bg-muted/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="bom-tolerance">Yield tolerance % <span className="font-normal text-muted-foreground">(current {bom.yieldTolerancePercent ?? 0})</span></Label>
                <Input id="bom-tolerance" className="max-w-40" type="number" min="0" max="1000" step="0.1" value={tolerance} onChange={(event) => setTolerance(event.target.value)} />
              </div>
              <Button variant="outline" disabled={!tolerance || !Number.isFinite(Number(tolerance)) || Number(tolerance) < 0 || Number(tolerance) > 1000} onClick={() => void saveTolerance()}>Save tolerance</Button>
            </div>}
            <BomComponentEditor
              bomId={bom.id}
              savedItems={bom.items}
              uoms={uoms}
              warehouses={warehouses}
              canWrite={editable}
              onSaved={setBom}
            />
          </CardContent>
        </Card>

        </TabsContent>
        <TabsContent value="routing" forceMount hidden={section !== "routing"}>
        <Card>
          <CardHeader>
            <CardTitle>Routing link</CardTitle>
            <CardDescription>Assign the routing used by production work orders. Changes save immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bom-route">Production routing</Label>
              <Select
                disabled={!editable}
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
                <SelectTrigger id="bom-route" className="w-full max-w-md">
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
                Assigned route: {selectedRoute.code} with {selectedRoute.operations.length} operation(s).
              </p>
            )}
          </CardContent>
        </Card>
        </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
