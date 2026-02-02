"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

export default function PricingRulesSettingsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Pricing rules"
        description="Optional. Configure rules that override or default tier selection (UI-only stub)."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Products" },
          { label: "Pricing rules" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain pricing rules and when they override tier selection." label="Explain" />
            <Button size="sm" onClick={() => window.alert("Add rule (stub). API pending.")}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add rule
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/master/products">Products</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rules</CardTitle>
            <CardDescription>E.g. customer segment → default price list, channel-based overrides. Placeholder.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No rules. Add rules (stub) above.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
