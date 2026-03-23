"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPutawayTask, updatePutawayTask, confirmPutawayTask, type WarehousePutawayRow } from "@/lib/api/warehouse-execution";
import { fetchWarehouseLocations } from "@/lib/api/warehouse-locations";
import { toast } from "sonner";

export default function PutawayDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = React.useState<WarehousePutawayRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [locations, setLocations] = React.useState<Array<{ id: string; code?: string; name: string }>>([]);
  const [allocations, setAllocations] = React.useState<Record<string, { putawayQty: string; locationId: string }>>({});

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchPutawayTask(id);
      setTask(payload);
      let resolvedLocations: Array<{ id: string; code?: string; name: string }> = [];
      if (payload?.warehouseId) {
        const nextLocations = await fetchWarehouseLocations(payload.warehouseId);
        resolvedLocations = nextLocations.map((location) => ({
          id: location.id,
          code: location.code,
          name: location.name,
        }));
        setLocations(resolvedLocations);
      }
      // Build a map from binCode → location.id so pre-existing bin assignments show correctly in the Select
      const codeToId = new Map(resolvedLocations.map((loc) => [loc.code ?? "", loc.id]));
      setAllocations(
        Object.fromEntries(
          (payload?.lines ?? []).map((line) => {
            const binCode = line.allocatedBins?.[0]?.binCode ?? "";
            const resolvedId = codeToId.get(binCode) ?? binCode;
            return [
              line.id,
              {
                putawayQty: String(line.putawayQty ?? 0),
                locationId: resolvedId,
              },
            ];
          })
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load putaway task.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!task && loading) return <PageShell><PageHeader title="Loading putaway..." /></PageShell>;
  if (!task) return <PageShell><PageHeader title="Putaway task not found" /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title={`Putaway - ${task.grnNumber}`}
        description={
          task.sourceDocumentId
            ? `${task.warehouse ?? "Warehouse"} · GRN ${task.grnNumber} (${task.sourceDocumentStatus ?? "POSTED"})`
            : task.warehouse
        }
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Putaway", href: "/warehouse/putaway" },
          { label: task.grnNumber },
        ]}
        sticky
        showCommandHint
        actions={<Button variant="outline" size="sm" asChild><Link href="/warehouse/putaway">Back to list</Link></Button>}
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Allocate to bins</CardTitle>
            <CardDescription>Save bin assignments, then confirm putaway to move quantity into location stock.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Putaway</TableHead>
                  <TableHead>Bin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.sku ?? "—"}</TableCell>
                    <TableCell>{line.productName ?? line.productId ?? "—"}</TableCell>
                    <TableCell>{line.receivedQty}</TableCell>
                    <TableCell>
                      <Input
                        className="w-24"
                        value={allocations[line.id]?.putawayQty ?? String(line.putawayQty ?? 0)}
                        onChange={(e) =>
                          setAllocations((current) => ({
                            ...current,
                            [line.id]: {
                              ...(current[line.id] ?? { locationId: "" }),
                              putawayQty: e.target.value,
                            },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={allocations[line.id]?.locationId ?? ""}
                        onValueChange={(value) =>
                          setAllocations((current) => ({
                            ...current,
                            [line.id]: {
                              putawayQty: current[line.id]?.putawayQty ?? String(line.putawayQty ?? 0),
                              locationId: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select bin" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.code ?? location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              await updatePutawayTask(
                task.id,
                task.lines.map((line) => ({
                  lineId: line.id,
                  putawayQty: Number(allocations[line.id]?.putawayQty ?? line.putawayQty ?? 0),
                  toLocationId: allocations[line.id]?.locationId || undefined,
                }))
              );
              toast.success("Putaway allocation saved.");
              await refresh();
            }}
          >
            Save allocation
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await confirmPutawayTask(task.id);
              toast.success("Putaway confirmed.");
              await refresh();
            }}
          >
            Confirm putaway
          </Button>
          {task.sourceDocumentId ? (
            <Button variant="outline" asChild>
              <Link href={`/inventory/receipts/${task.sourceDocumentId}`}>Open receipt</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
