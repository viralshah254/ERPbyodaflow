"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FranchiseCommissionPage() {
  return (
    <PageShell>
      <PageHeader
        title="Commission & Rebates"
        description="Weekly commission payouts and margin guarantee top-ups"
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/commission" },
          { label: "Commission & Rebates" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Commission engine</CardTitle>
            <CardDescription>
              Configure rules, run weekly commission runs, and view payout history. Margin guarantee and top-up logic (e.g. 8-week launch phase) — coming with full implementation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is available when the Cool Catch (or franchise) template is enabled. Backend: commission rules, weekly run, conditional journal entries for top-ups.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
