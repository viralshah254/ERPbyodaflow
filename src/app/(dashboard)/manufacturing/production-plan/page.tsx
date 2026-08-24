"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import {
  applyProductionPlan,
  explodeProductionPlan,
  fetchProductionPlanDefaults,
  type ExplodedProductionPlan,
  type ProductionPlanRow,
  type ProductionPlanTreeNode,
} from "@/lib/api/manufacturing";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function qtyLabel(value: number, uom?: string) {
  const n = Number.isFinite(value) ? value : 0;
  return uom ? `${n} ${uom}` : String(n);
}

function TreeBlock({ nodes }: { nodes: ProductionPlanTreeNode[] }) {
  if (!nodes.length) return null;
  return (
    <ul className="space-y-1 text-sm">
      {nodes.map((node) => (
        <li key={`${node.kind}-${node.productId}-${node.quantity}`}>
          <span className="text-muted-foreground">{node.kind}</span>{" "}
          <span className="font-medium">{node.productName}</span>{" "}
          <span className="tabular-nums">{qtyLabel(node.quantity, node.uom)}</span>
          {node.children.length > 0 && (
            <div className="ml-4 mt-1 border-l pl-3">
              <TreeBlock nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ProductionPlanPage() {
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const canWrite = useCanWriteManufacturing();

  const [defaults, setDefaults] = React.useState<ProductionPlanRow[]>([]);
  const [qtyById, setQtyById] = React.useState<Record<string, string>>({});
  const [showZeros, setShowZeros] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [calculating, setCalculating] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [plan, setPlan] = React.useState<ExplodedProductionPlan | null>(null);

  const loadDefaults = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProductionPlanDefaults();
      setDefaults(result.items ?? []);
      setQtyById((current) => {
        const next = { ...current };
        for (const item of result.items ?? []) {
          if (next[item.productId] == null) next[item.productId] = "";
        }
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load pack list.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDefaults();
  }, [loadDefaults]);

  const packLines = React.useMemo(
    () =>
      defaults
        .map((item) => ({
          productId: item.productId,
          quantity: Number(qtyById[item.productId] ?? "") || 0,
        }))
        .filter((line) => line.quantity > 0),
    [defaults, qtyById]
  );

  const visibleDefaults = showZeros ? defaults : defaults.filter((item) => Number(qtyById[item.productId] ?? "") > 0 || (item.suggestedQty ?? 0) > 0);

  const prefillFromSales = () => {
    const next: Record<string, string> = {};
    for (const item of defaults) {
      next[item.productId] = item.suggestedQty && item.suggestedQty > 0 ? String(item.suggestedQty) : "";
    }
    setQtyById(next);
    setPlan(null);
  };

  const handleCalculate = async () => {
    if (!packLines.length) {
      toast.error("Enter pack quantities for at least one finished product.");
      return;
    }
    setCalculating(true);
    try {
      const exploded = await explodeProductionPlan(packLines);
      setPlan(exploded);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to explode the pack plan.");
    } finally {
      setCalculating(false);
    }
  };

  const handleApply = async () => {
    if (!canWrite) return;
    if (!packLines.length) {
      toast.error("Enter pack quantities for at least one finished product.");
      return;
    }
    setApplying(true);
    try {
      const result = await applyProductionPlan(packLines);
      setPlan(result.explode);
      toast.success(
        result.created.length
          ? `Created ${result.created.length} draft work order${result.created.length === 1 ? "" : "s"}.`
          : "No work orders needed — stock already covers this plan."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create work orders.");
    } finally {
      setApplying(false);
    }
  };

  const packColumns = React.useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        accessor: (r: ProductionPlanRow) => (
          <span className="font-mono text-xs">{r.productSku ?? "—"}</span>
        ),
        sticky: true,
      },
      {
        id: "name",
        header: "Finished product",
        accessor: (r: ProductionPlanRow) => <span className="font-medium text-sm">{r.productName}</span>,
      },
      {
        id: "onHand",
        header: "On hand",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.onHandQty}</span>,
      },
      {
        id: "sales",
        header: "Open sales",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.requiredQty}</span>,
      },
      {
        id: "incoming",
        header: "Open WOs",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.incomingQty}</span>,
      },
      {
        id: "qty",
        header: "Pack qty",
        accessor: (r: ProductionPlanRow) => (
          <Input
            type="number"
            min={0}
            step="1"
            className="h-8 w-24 tabular-nums"
            value={qtyById[r.productId] ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setQtyById((prev) => ({ ...prev, [r.productId]: value }));
              setPlan(null);
            }}
            aria-label={`Pack quantity for ${r.productName}`}
          />
        ),
      },
    ],
    [qtyById]
  );

  const resultColumns = React.useMemo(
    () => [
      {
        id: "item",
        header: "Item",
        accessor: (r: ProductionPlanRow) => (
          <span className="text-sm font-medium">
            {r.productSku ? `${r.productSku} — ${r.productName}` : r.productName}
          </span>
        ),
      },
      {
        id: "uom",
        header: "UOM",
        accessor: (r: ProductionPlanRow) => <span className="text-sm">{r.uom}</span>,
      },
      {
        id: "required",
        header: "Required",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.requiredQty}</span>,
      },
      {
        id: "onHand",
        header: "On hand",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.onHandQty}</span>,
      },
      {
        id: "incoming",
        header: "Incoming",
        accessor: (r: ProductionPlanRow) => <span className="tabular-nums text-sm">{r.incomingQty}</span>,
      },
      {
        id: "shortage",
        header: "To make / buy",
        accessor: (r: ProductionPlanRow) => (
          <span className="tabular-nums text-sm font-semibold">{r.shortageQty}</span>
        ),
      },
    ],
    []
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Production Plan"
        description="Enter today’s pack quantities, then work backwards through semi-finished batches to raw materials."
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "Production Plan" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/work-orders">Work orders</Link>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={prefillFromSales} disabled={loading || !defaults.length}>
            Prefill from sales
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowZeros((v) => !v)}>
            {showZeros ? "Hide zero rows" : "Show all SKUs"}
          </Button>
          <Button size="sm" onClick={() => void handleCalculate()} disabled={calculating || loading}>
            {calculating ? "Calculating…" : "Work backwards"}
          </Button>
          {canWrite && (
            <Button size="sm" variant="secondary" onClick={() => void handleApply()} disabled={applying || loading}>
              {applying ? "Creating…" : "Create work orders"}
            </Button>
          )}
        </div>

        {loading ? (
          <SkeletonDataTable rows={8} columnWidths={["w-20", "w-48", "w-16", "w-16", "w-16", "w-24"]} />
        ) : (
          <div className="rounded-xl border bg-card shadow-sm">
            <DataTable
              data={visibleDefaults.length ? visibleDefaults : defaults}
              columns={packColumns}
              emptyMessage="No finished products with a recipe were found."
              scrollMode="natural"
              size="comfortable"
            />
          </div>
        )}

        {plan && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Make</h2>
                <Badge variant="default">{plan.make.length + plan.packLines.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Components first (items with their own BOM), then packing. Shortage is what still needs a work order.
              </p>
              <div className="rounded-xl border bg-card shadow-sm">
                <DataTable
                  data={[...plan.make, ...plan.packLines]}
                  columns={resultColumns}
                  emptyMessage="Nothing to make."
                  scrollMode="natural"
                  size="comfortable"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Buy</h2>
                <Badge variant="secondary">{plan.buy.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Raw materials and packaging. Create purchase requests from the purchasing screen as usual.
              </p>
              <div className="rounded-xl border bg-card shadow-sm">
                <DataTable
                  data={plan.buy}
                  columns={resultColumns}
                  emptyMessage="No purchases required."
                  scrollMode="natural"
                  size="comfortable"
                />
              </div>
            </div>
            <div className="space-y-3 lg:col-span-2">
              <h2 className="text-base font-semibold">Explosion tree</h2>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                {plan.tree.length ? <TreeBlock nodes={plan.tree} /> : (
                  <p className="text-sm text-muted-foreground">No pack lines to explode.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0" />
          Tighten BOM quantities after the first production run and this planner will follow. Create work orders in Make order (components, then packs). Complete each order to consume inputs and receive the output.
        </p>
      </div>
    </PageShell>
  );
}
