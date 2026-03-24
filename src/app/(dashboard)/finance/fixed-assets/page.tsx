"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchAssetsApi } from "@/lib/api/assets";
import { fetchDepreciationRunsApi } from "@/lib/api/assets-lifecycle";
import { fetchAssetDisposalsApi } from "@/lib/api/asset-disposals";
import type { AssetRow } from "@/lib/types/assets";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FixedAssetsPage() {
  const baseCurrency = useBaseCurrency();
  const [assets, setAssets] = React.useState<AssetRow[]>([]);
  const [depreciationCount, setDepreciationCount] = React.useState(0);
  const [disposalCount, setDisposalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [assetRows, depreciationRuns, disposals] = await Promise.all([
          fetchAssetsApi(),
          fetchDepreciationRunsApi(),
          fetchAssetDisposalsApi(),
        ]);
        if (!active) return;
        setAssets(assetRows);
        setDepreciationCount(depreciationRuns.length);
        setDisposalCount(disposals.length);
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Failed to load fixed asset metrics.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const totalCost = assets.reduce((sum, asset) => sum + (asset.cost ?? 0), 0);
  const activeCount = assets.filter((asset) => asset.status === "ACTIVE").length;

  return (
    <PageShell>
      <PageHeader
        title="Fixed Assets"
        description="Track asset register, depreciation runs, and disposal posting."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Fixed Assets" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/assets/overview">Assets Overview</Link>
            </Button>
            <Button asChild>
              <Link href="/assets/register">
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Asset Count</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? "..." : assets.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Active Assets</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? "..." : activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Cost</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? "..." : formatMoney(totalCost, baseCurrency)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Depreciation Runs</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{loading ? "..." : depreciationCount}</CardContent>
        </Card>
      </div>
      <div className="p-6 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assets.length === 0 && !loading ? (
              <EmptyState
                icon="Building"
                title="No assets"
                description="Add fixed assets to track depreciation and disposal journals."
                action={{ label: "Add Asset", onClick: () => (window.location.href = "/assets/register") }}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button asChild><Link href="/assets/register">Asset Register</Link></Button>
                <Button variant="outline" asChild><Link href="/assets/depreciation">Run Depreciation</Link></Button>
                <Button variant="outline" asChild><Link href="/assets/disposals">Disposals ({disposalCount})</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
