"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FranchiseVmiPage() {
  return (
    <PageShell>
      <PageHeader
        title="VMI & Replenishment"
        description="Franchisee stock visibility and auto-replenishment from Cold Hub"
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/vmi" },
          { label: "VMI & Replenishment" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Managed Inventory</CardTitle>
            <CardDescription>
              Ingest sales data from franchisee-facing system; live stock velocity; reorder points; system-generated transfer orders from Cold Hub to franchisee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is available when the Cool Catch (or franchise) template is enabled. Backend: API/webhook for franchisee sales; min-max or reorder point logic; transfer order generation.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
