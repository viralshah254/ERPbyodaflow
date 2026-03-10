"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  ExplanationCard,
  ForecastCard,
  RecommendationCard,
  AnomalyCard,
  SimulationCard,
} from "@/components/analytics/insight-cards";
import { fetchAnalyticsInsights } from "@/lib/api/analytics";
import { toast } from "sonner";

export default function AnalyticsInsightsPage() {
  const [inventoryInsights, setInventoryInsights] = React.useState<Awaited<ReturnType<typeof fetchAnalyticsInsights>> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchAnalyticsInsights("inventory")
      .then((res) => {
        if (!cancelled) setInventoryInsights(res);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = (e as Error)?.message ?? "Failed to load insights.";
          if (msg === "STUB") {
            setInventoryInsights({ module: "inventory", data: [] });
          } else {
            toast.error(msg);
            setInventoryInsights({ module: "inventory", data: [] });
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Insights"
        description="AI explains why, forecasts, recommends, and simulates"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Insights" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-4">
        {/* Baseline narrative cards */}
        <ExplanationCard
          title="Revenue down 8% MoM"
          summary="Lower volume in Retail channel; Wholesale flat."
          actionLabel="View by channel"
          actionHref="/analytics/explore"
        />
        <ForecastCard
          title="Next month revenue"
          summary="Predicted KES 1.2M ±5% based on pipeline and seasonality."
          actionLabel="Adjust forecast"
          actionHref="/analytics/explore"
        />

        {/* Inventory insights from backend when available */}
        {!loading &&
          inventoryInsights &&
          inventoryInsights.data
            .filter((i) => i.type === "low_stock")
            .slice(0, 3)
            .map((i, idx) => (
              <AnomalyCard
                key={`${i.productId}-${i.warehouseId}-${idx}`}
                title={`Low stock: ${i.productId} @ ${i.warehouseId}`}
                summary={`Quantity ${i.quantity} vs threshold ${i.minThreshold}.`}
                severity="WARNING"
                actionLabel="Review stock levels"
                actionHref={i.drillPath || "/inventory/stock-levels"}
              />
            ))}

        {/* Generic recommendation + simulation cards */}
        <RecommendationCard
          title="Fix margin on SKU-002"
          summary="Gross margin 12% vs target 25%. Consider list or cost review."
          actionLabel="Open pricing"
          actionHref="/master/products/p2/pricing"
        />
        <SimulationCard
          title="Price tier +5%"
          summary="Simulated margin impact +2.1 pts; revenue +4.3%. Run what-if."
          actionLabel="Open simulation"
          actionHref="/analytics/simulations"
        />
      </div>
    </PageShell>
  );
}
