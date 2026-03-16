"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAssetsApi } from "@/lib/api/assets";
import { fetchAssetDisposalsApi } from "@/lib/api/asset-disposals";
import { fetchDepreciationRunsApi } from "@/lib/api/assets-lifecycle";
import { useCopilotStore } from "@/stores/copilot-store";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/assets/register", label: "Asset register", desc: "Create/edit assets", icon: "BookOpen" as const },
  { href: "/assets/depreciation", label: "Depreciation", desc: "Run depreciation, preview, post", icon: "TrendingDown" as const },
  { href: "/assets/disposals", label: "Disposals", desc: "Disposal wizard, gain/loss", icon: "Trash2" as const },
];

export default function AssetsOverviewPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [activeAssets, setActiveAssets] = React.useState(0);
  const [totalCost, setTotalCost] = React.useState(0);
  const [disposalsCount, setDisposalsCount] = React.useState(0);
  const [depreciationRunsCount, setDepreciationRunsCount] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    async function load() {
      const [assets, disposals, runs] = await Promise.all([
        fetchAssetsApi(),
        fetchAssetDisposalsApi(),
        fetchDepreciationRunsApi(),
      ]);
      if (!active) return;
      const openAssets = assets.filter((asset) => asset.status === "ACTIVE");
      setActiveAssets(openAssets.length);
      setTotalCost(openAssets.reduce((sum, asset) => sum + asset.cost, 0));
      setDisposalsCount(disposals.length);
      setDepreciationRunsCount(runs.length);
    }
    void load().catch((error) => {
      if (!active) return;
      toast.error(error instanceof Error ? error.message : "Failed to load asset overview.");
      setActiveAssets(0);
      setTotalCost(0);
      setDisposalsCount(0);
      setDepreciationRunsCount(0);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Fixed Assets"
        description="Register, depreciation, disposals"
        breadcrumbs={[{ label: "Assets" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" onClick={() => openWithPrompt("Explain fixed assets, depreciation methods, and disposal accounting.")}>
            <Icons.Sparkles className="mr-2 h-4 w-4" />
            Ask Copilot
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick stats</span>
          <ExplainThis prompt="Explain depreciation run and posting to journal." label="Explain assets" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active assets</CardTitle>
              <Icons.BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAssets}</div>
              <p className="text-xs text-muted-foreground">In register</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total cost</CardTitle>
              <Icons.DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalCost, "KES")}</div>
              <p className="text-xs text-muted-foreground">Gross</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disposals</CardTitle>
              <Icons.Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{disposalsCount}</div>
              <p className="text-xs text-muted-foreground">Posted</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Depreciation</CardTitle>
              <Icons.TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{depreciationRunsCount}</div>
              <p className="text-xs text-muted-foreground">Runs posted</p>
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
