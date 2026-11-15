"use client";

import * as React from "react";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { MassBalanceChart } from "@/components/operational/MassBalanceChart";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { fetchByproductInventory, type ByproductRow, type ByproductYieldSummary } from "@/lib/api/manufacturing-byproducts";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

type Col = ByproductRow;

const columns = [
  { id: "sku",         header: "SKU",             accessor: (r: Col) => r.sku,                                                                          sticky: true },
  { id: "product",     header: "Product",          accessor: (r: Col) => r.productName },
  { id: "warehouse",   header: "Warehouse",        accessor: (r: Col) => r.warehouse ?? "—" },
  { id: "qty",         header: "Qty (kg)",         accessor: (r: Col) => r.qtyKg.toLocaleString() },
  { id: "reserved",    header: "Reserved (kg)",    accessor: (r: Col) => r.reservedKg.toLocaleString() },
  { id: "available",   header: "Available (kg)",   accessor: (r: Col) => r.availableKg.toLocaleString() },
  { id: "unitCost",    header: "Unit cost/kg",     accessor: (r: Col) => r.unitCost != null ? r.unitCost.toLocaleString() : "—" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManufacturingByproductsPage() {
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const [rows,    setRows]    = React.useState<ByproductRow[]>([]);
  const [summary, setSummary] = React.useState<ByproductYieldSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    // Never fall back to sample stock: a failed load must look like a failed load.
    fetchByproductInventory()
      .then((data) => {
        setRows(data.items);
        setSummary(data.yieldSummary);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Byproduct stock could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const inputKg     = summary?.totalInputKg     ?? 0;
  const primaryKg   = summary?.totalPrimaryKg   ?? 0;
  const secondaryKg = summary?.totalSecondaryKg ?? 0;
  const wasteKg     = summary?.totalWasteKg     ?? 0;

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Byproducts"
        description="Track byproduct stock, valuation, reservation, and destination channel."
        breadcrumbs={[{ label: areaLabel, href: "/manufacturing/yield" }, { label: "Byproducts" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        {loadError && !loading && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {loadError} Refresh the page to try again.
          </div>
        )}

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <YieldBreakdownCard
            inputKg={inputKg}
            primaryKg={primaryKg}
            secondaryKg={secondaryKg}
            lossKg={wasteKg}
          />
          <MassBalanceChart
            inputKg={inputKg}
            outputKg={primaryKg}
            byproductKg={secondaryKg}
            wasteKg={wasteKg}
            title="Byproduct Mass Balance"
          />
        </div>

        <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Byproduct inventory</h3>
            <p className="text-xs text-muted-foreground">Secondary outputs from filleting and processing — stock on hand, reservations, and valuation.
              {summary ? ` Aggregated across ${summary.batchCount} yield batch${summary.batchCount !== 1 ? "es" : ""}.` : ""}</p>
          </div>
          <DataTable<Col>
              data={loading ? [] : rows}
              columns={columns}
              emptyMessage={loading ? "Loading…" : "No byproduct SKUs found. Mark products with productRole = BYPRODUCT via the seed or admin."}
              scrollMode="natural"
              size="comfortable"
              />
        </div>
      </div>
    </PageShell>
  );
}
