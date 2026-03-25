"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { MassBalanceChart } from "@/components/operational/MassBalanceChart";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { fetchByproductInventory, type ByproductRow, type ByproductYieldSummary } from "@/lib/api/manufacturing-byproducts";
import { isApiConfigured } from "@/lib/api/client";

// ── Static demo data shown when API is not wired ─────────────────────────────

const DEMO_ROWS: ByproductRow[] = [
  { productId: "demo-1", sku: "NP-FRAME",  productName: "Nile Perch Frame (Mgongo Wazi)", qtyKg: 3000, reservedKg: 200,  availableKg: 2800, unitCost: 55,   warehouseId: null, warehouse: "Main Store" },
  { productId: "demo-2", sku: "NP-MAW-SM", productName: "Nile Perch Maw — 0-50g",        qtyKg: 180,  reservedKg: 40,   availableKg: 140,  unitCost: 7900, warehouseId: null, warehouse: "Main Store" },
  { productId: "demo-3", sku: "NP-SKIN",   productName: "Nile Perch Skin",                qtyKg: 760,  reservedKg: 0,    availableKg: 760,  unitCost: 20,   warehouseId: null, warehouse: "Main Store" },
  { productId: "demo-4", sku: "TP-FRAME",  productName: "Tilapia Frame (Mgongo Wazi)",    qtyKg: 5800, reservedKg: 500,  availableKg: 5300, unitCost: 90,   warehouseId: null, warehouse: "Main Store" },
  { productId: "demo-5", sku: "TP-SKIN",   productName: "Tilapia Skin",                   qtyKg: 500,  reservedKg: 0,    availableKg: 500,  unitCost: 20,   warehouseId: null, warehouse: "Main Store" },
  { productId: "demo-6", sku: "TP-CHIPS",  productName: "Tilapia Chips",                  qtyKg: 300,  reservedKg: 15,   availableKg: 285,  unitCost: 280,  warehouseId: null, warehouse: "Main Store" },
];

const DEMO_SUMMARY: ByproductYieldSummary = {
  batchCount: 4,
  totalInputKg: 20000,
  totalPrimaryKg: 7390,
  totalSecondaryKg: 10540,
  totalWasteKg: 2070,
  totalYieldPct: 89.65,
  primaryPct: 36.95,
  secondaryPct: 52.7,
  wastePct: 10.35,
};

// ── Column definitions ────────────────────────────────────────────────────────

type Col = (typeof DEMO_ROWS)[number];

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
  const [rows,    setRows]    = React.useState<ByproductRow[]>([]);
  const [summary, setSummary] = React.useState<ByproductYieldSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDemo,  setIsDemo]  = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setRows(DEMO_ROWS);
      setSummary(DEMO_SUMMARY);
      setIsDemo(true);
      setLoading(false);
      return;
    }
    fetchByproductInventory()
      .then((data) => {
        setRows(data.items);
        setSummary(data.yieldSummary);
      })
      .catch(() => {
        setRows(DEMO_ROWS);
        setSummary(DEMO_SUMMARY);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const inputKg     = summary?.totalInputKg     ?? 0;
  const primaryKg   = summary?.totalPrimaryKg   ?? 0;
  const secondaryKg = summary?.totalSecondaryKg ?? 0;
  const wasteKg     = summary?.totalWasteKg     ?? 0;

  return (
    <PageShell>
      <PageHeader
        title="Byproducts"
        description="Track byproduct stock, valuation, reservation, and destination channel."
        breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/yield" }, { label: "Byproducts" }]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        {isDemo && !loading && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Showing demo data — connect the API to see live byproduct inventory.
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

        <Card>
          <CardHeader>
            <CardTitle>Byproduct inventory</CardTitle>
            <CardDescription>
              Secondary outputs from filleting and processing — stock on hand, reservations, and valuation.
              {summary ? ` Aggregated across ${summary.batchCount} yield batch${summary.batchCount !== 1 ? "es" : ""}.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<Col>
              data={loading ? [] : rows}
              columns={columns}
              emptyMessage={loading ? "Loading…" : "No byproduct SKUs found. Mark products with productRole = BYPRODUCT via the seed or admin."}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
