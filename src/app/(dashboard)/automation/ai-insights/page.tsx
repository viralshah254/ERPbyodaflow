"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { CopilotActionCards } from "@/components/copilot/CopilotActionCards";
import { AnomalyDetection } from "@/components/ai/anomaly-detection";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AIInsightsPage() {
  return (
    <PageShell>
      <PageHeader
        title="AI Insights"
        description="Action cards, anomaly detection, pricing & payroll intelligence"
        breadcrumbs={[{ label: "Automation" }, { label: "AI Insights" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/work/queue">Work queue</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <CopilotActionCards />
        <AnomalyDetection />
      </div>
    </PageShell>
  );
}





