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

export default function AnalyticsInsightsPage() {
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
        <RecommendationCard
          title="Fix margin on SKU-002"
          summary="Gross margin 12% vs target 25%. Consider list or cost review."
          actionLabel="Open pricing"
          actionHref="/master/products/p2/pricing"
        />
        <AnomalyCard
          title="Stockout spike — Widget A"
          summary="3 days stockout in Jan vs 0 in Dec. Demand spike or replenishment delay."
          severity="WARNING"
          actionLabel="Investigate"
          actionHref="/analytics/inventory"
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
