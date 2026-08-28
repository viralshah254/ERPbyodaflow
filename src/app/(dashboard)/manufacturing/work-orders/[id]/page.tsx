"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  checkWorkOrderAvailability,
  fetchManufacturingWorkOrder,
  runManufacturingWorkOrderAction,
  type ManufacturingWorkOrder,
  type MaterialAvailabilityLine,
} from "@/lib/api/manufacturing";
import { MaterialComponentLinks } from "@/components/manufacturing/material-component-links";
import { manufacturingAreaLabel, t } from "@/lib/terminology";
import { isSeafoodOrg } from "@/config/industry";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "RELEASED", label: "Released" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function stepIndex(status: string): number {
  if (status === "CANCELLED") return -1;
  const i = STEPS.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

export default function WorkOrderDetailPage() {
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
  const woLabel = t("workOrder", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafoodOrg = isSeafoodOrg(templateId, industryCategory);

  const [order, setOrder] = React.useState<ManufacturingWorkOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  const [availLines, setAvailLines] = React.useState<MaterialAvailabilityLine[]>([]);
  const [availLoading, setAvailLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchManufacturingWorkOrder(id);
      setOrder(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load work order.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!order?.bomId || order.status === "COMPLETED" || order.status === "CANCELLED") {
      setAvailLines([]);
      return;
    }
    let cancelled = false;
    setAvailLoading(true);
    void checkWorkOrderAvailability(order.bomId, order.quantity)
      .then((result) => {
        if (!cancelled) setAvailLines(result.lines);
      })
      .catch(() => {
        if (!cancelled) setAvailLines([]);
      })
      .finally(() => {
        if (!cancelled) setAvailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.bomId, order?.quantity, order?.status]);

  const shortfalls = availLines.filter((line) => line.shortfall > 0);
  const currentStep = order ? stepIndex(order.status) : 0;

  async function runAction(action: "release" | "start" | "complete" | "cancel") {
    if (!order) return;
    setActing(true);
    try {
      const next = await runManufacturingWorkOrderAction(order.id, {
        action,
        producedQuantity:
          action === "complete"
            ? order.openQuantity > 0
              ? order.quantity
              : order.producedQuantity
            : undefined,
      });
      setOrder(next);
      toast.success(
        action === "release"
          ? "Released. Floor can start this batch."
          : action === "start"
            ? "Marked in progress."
            : action === "complete"
              ? "Completed. Materials issued and finished goods received."
              : "Cancelled."
      );
      if (action === "cancel") router.push("/manufacturing/work-orders");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  const productLabel = order
    ? order.productSku
      ? `${order.productSku} — ${order.productName ?? ""}`
      : (order.productName ?? order.productId)
    : "";

  return (
    <PageShell>
      <PageHeader
        title={loading ? woLabel : (order?.number ?? woLabel)}
        description={
          loading
            ? "Loading…"
            : order
              ? `${productLabel}. Walk this batch through release, start, and complete — not from the list.`
              : "Work order not found."
        }
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/work-orders" },
          { label: woLabel, href: "/manufacturing/work-orders" },
          { label: order?.number ?? "Detail" },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/work-orders">
              <Icons.ArrowLeft className="mr-2 h-4 w-4" />
              All work orders
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading work order…</p>
        ) : !order ? (
          <p className="text-sm text-muted-foreground">This work order does not exist or you cannot open it.</p>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-lg">Production steps</CardTitle>
                  <StatusBadge status={order.status} />
                </div>
                <CardDescription>
                  Planned {order.plannedQuantity} · produced {order.producedQuantity} · open {order.openQuantity}
                  {order.bomName ? ` · BOM ${order.bomName}` : ""}
                  {order.routingName ? ` · routing ${order.routingName}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {order.status === "CANCELLED" ? (
                  <p className="text-sm text-muted-foreground">This work order was cancelled.</p>
                ) : (
                  <ol className="grid gap-3 sm:grid-cols-4">
                    {STEPS.map((step, i) => {
                      const done = currentStep > i;
                      const current = currentStep === i;
                      return (
                        <li
                          key={step.key}
                          className={cn(
                            "rounded-xl border px-3 py-3",
                            current && "border-primary bg-primary/10",
                            done && "border-emerald-500/40 bg-emerald-500/5",
                            !current && !done && "border-border bg-muted/30"
                          )}
                        >
                          <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                          <p className="text-sm font-semibold">{step.label}</p>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {canWrite && order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
                  <div className="flex flex-wrap gap-2">
                    {order.status === "DRAFT" && (
                      <Button size="sm" disabled={acting} onClick={() => void runAction("release")}>
                        Release this order
                      </Button>
                    )}
                    {order.status === "RELEASED" && (
                      <Button size="sm" variant="outline" disabled={acting} onClick={() => void runAction("start")}>
                        Mark in progress
                      </Button>
                    )}
                    {(order.status === "RELEASED" || order.status === "IN_PROGRESS") && (
                      <Button
                        size="sm"
                        disabled={acting || shortfalls.length > 0 || availLoading}
                        onClick={() => void runAction("complete")}
                      >
                        Complete this order
                      </Button>
                    )}
                    {(order.status === "DRAFT" || order.status === "RELEASED") && (
                      <Button size="sm" variant="ghost" disabled={acting} onClick={() => void runAction("cancel")}>
                        Cancel
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {order.status !== "COMPLETED" && order.status !== "CANCELLED" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Materials in the warehouse</CardTitle>
                  <CardDescription>
                    Completing issues real on-hand stock. Production Plan “Covered” can include other work orders
                    that are not finished yet — those are not in the warehouse until you complete them first
                    {seafoodOrg
                      ? " (for example process whole fish before packing fillets)."
                      : " (process components before packing the finished SKU)."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!order.bomId ? (
                    <p className="text-sm text-muted-foreground">No BOM is linked, so availability cannot be checked here.</p>
                  ) : availLoading ? (
                    <p className="text-sm text-muted-foreground">Checking on-hand…</p>
                  ) : availLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No BOM components to issue.</p>
                  ) : (
                    <>
                      {shortfalls.length > 0 ? (
                        <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                          Short on {shortfalls.length} component{shortfalls.length === 1 ? "" : "s"}. Complete or
                          receive those items first. Complete stays off until warehouse qty covers the recipe.
                        </p>
                      ) : (
                        <p className="mb-3 text-sm text-muted-foreground">On-hand covers this recipe.</p>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">On hand</TableHead>
                            <TableHead className="text-right">Short</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availLines.map((line) => (
                            <TableRow key={line.productId} className={line.shortfall > 0 ? "bg-destructive/10" : undefined}>
                              <TableCell>
                                <MaterialComponentLinks line={line} />
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.requiredQty} {line.uom}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{line.onHandQty}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.shortfall > 0 ? line.shortfall : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
