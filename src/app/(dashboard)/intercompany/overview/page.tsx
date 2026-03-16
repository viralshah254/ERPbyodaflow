"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchIntercompanyEntitiesApi, fetchIntercompanyTransactionsApi } from "@/lib/api/intercompany";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/settings/organization/entities", label: "Entities", desc: "Company A, B. Base currency, IC mapping", icon: "Building2" as const },
  { href: "/intercompany/transactions", label: "IC Transactions", desc: "IC invoice, IC bill, elimination journal", icon: "ArrowLeftRight" as const },
];

export default function IntercompanyOverviewPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [entitiesCount, setEntitiesCount] = React.useState(0);
  const [transactionsCount, setTransactionsCount] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    void Promise.all([fetchIntercompanyEntitiesApi(), fetchIntercompanyTransactionsApi()])
      .then(([entities, txns]) => {
        if (!active) return;
        setEntitiesCount(entities.length);
        setTransactionsCount(txns.length);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Failed to load intercompany overview.");
        setEntitiesCount(0);
        setTransactionsCount(0);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Intercompany"
        description="Multi-entity, IC transactions, consolidation"
        breadcrumbs={[{ label: "Intercompany" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => openWithPrompt("Explain intercompany transactions and elimination journals.")}>
            <Icons.Sparkles className="mr-2 h-4 w-4" />
            Ask Copilot
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick stats</span>
          <ExplainThis prompt="Explain consolidation and elimination entries." label="Explain intercompany" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entities</CardTitle>
              <Icons.Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entitiesCount}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IC transactions</CardTitle>
              <Icons.ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactionsCount}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consolidation</CardTitle>
              <Icons.PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">P&L stub</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Circle) as React.ComponentType<{ className?: string }>;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center gap-2">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
