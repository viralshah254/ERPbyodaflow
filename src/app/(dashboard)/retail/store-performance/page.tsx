"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";

const MOCK_STORES = [
  { id: "1", name: "Store A", salesMtd: 450000, target: 500000, trend: "+5%" },
  { id: "2", name: "Store B", salesMtd: 320000, target: 350000, trend: "-2%" },
];

export default function RetailStorePerformancePage() {
  const terminology = useTerminology();
  const storeLabel = t("store", terminology);

  return (
    <PageLayout
      title={`${storeLabel} performance`}
      description="Store KPIs and trends"
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <KPICard title="Total sales MTD" value="KES 770,000" change={{ value: "+3%", type: "increase" }} icon="TrendingUp" />
        <KPICard title="Stores active" value="2" icon="Store" />
        <KPICard title="Avg. per store" value="KES 385,000" icon="BarChart3" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>By {storeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_STORES.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="font-medium">{s.name}</div>
                <div className="text-right text-sm">
                  <div>KES {s.salesMtd.toLocaleString()} / {s.target.toLocaleString()}</div>
                  <div className={s.trend.startsWith("+") ? "text-emerald-600" : "text-red-600"}>{s.trend}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
