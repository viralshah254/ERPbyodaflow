"use client";

import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SubcontractingPage() {
  return (
    <PageShell>
      <PageHeader
        title="Subcontracting / Job Work"
        description="WIP at external work centers (factories, women's groups); processing fees and yield"
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Subcontracting" },
        ]}
        sticky
        showCommandHint
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>External work centers</CardTitle>
            <CardDescription>
              Track inventory at third-party processors (industrial factories, women&apos;s groups). Stock remains on your books; receive finished goods with per-unit processing fee; mass balance and yield analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is available when the Cool Catch (or subcontracting) template is enabled. Backend: external work centers; transfer to processor; WIP balance; receive with fee; reverse BOM / co-products.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
