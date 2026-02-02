"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  MetricPicker,
  DimensionStack,
  GlobalFilterBar,
  InsightCanvas,
  ExplorerTable,
  DrillDrawer,
} from "@/components/analytics";
import {
  runAnalyticsQuery,
  getMetric,
  getSavedAnalysisViews,
  saveAnalysisView,
  getShareableLink,
} from "@/lib/analytics";
import type { MetricKey, DimensionKey } from "@/lib/analytics/semantic";
import type { AnalyticsQuery, AnalyticsRow, DrillContext } from "@/lib/analytics/types";
import type { AnalyticsGlobalFilters } from "@/lib/analytics/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as Icons from "lucide-react";

export default function AnalyticsExplorePage() {
  const [metric, setMetric] = React.useState<MetricKey>("revenue");
  const [dims, setDims] = React.useState<DimensionKey[]>(["time"]);
  const [filters, setFilters] = React.useState<AnalyticsGlobalFilters>({});
  const [drill, setDrill] = React.useState<DrillContext | null>(null);
  const [drillOpen, setDrillOpen] = React.useState(false);
  const [savedViews, setSavedViews] = React.useState(() => getSavedAnalysisViews());

  const query: AnalyticsQuery = React.useMemo(
    () => ({ metric, dimensions: dims, filters, limit: 20 }),
    [metric, dims, filters]
  );
  const result = React.useMemo(
    () => runAnalyticsQuery(query),
    [query]
  );
  const def = getMetric(metric);

  const toggleDim = (d: DimensionKey) => {
    if (dims.includes(d)) setDims(dims.filter((x) => x !== d));
    else if (dims.length < 3 && def.allowedDimensions.includes(d))
      setDims([...dims, d]);
  };

  const handleDrill = (row: AnalyticsRow) => {
    setDrill({
      query,
      row,
      drillTarget: def.drillTarget,
      drillFilters: row.dimensions as Record<string, string>,
    });
    setDrillOpen(true);
  };

  const handleSaveView = () => {
    const name = `View ${metric} by ${dims.join(", ")}`;
    const view = saveAnalysisView(name, query, filters);
    setSavedViews(getSavedAnalysisViews());
    window.alert(`Saved "${name}". Shareable link (stub): ${getShareableLink(view)}`);
  };

  const handleRestoreView = (viewId: string) => {
    const v = savedViews.find((s) => s.id === viewId);
    if (!v) return;
    setMetric(v.query.metric);
    setDims([...v.query.dimensions]);
    setFilters(v.filters ?? {});
  };

  return (
    <PageShell>
      <PageHeader
        title="Explore"
        description="One metric, up to 3 dimensions. One insight per screen."
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Explore" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Icons.Bookmark className="mr-2 h-4 w-4" />
                  Saved views
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {savedViews.length === 0 ? (
                  <DropdownMenuItem disabled>No saved views</DropdownMenuItem>
                ) : (
                  savedViews.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => handleRestoreView(v.id)}
                    >
                      {v.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="default" size="sm" onClick={handleSaveView}>
              <Icons.Save className="mr-2 h-4 w-4" />
              Save view
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Metric</span>
            <MetricPicker value={metric} onChange={setMetric} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Dimensions</span>
            <DimensionStack metric={metric} selected={dims} onToggle={toggleDim} />
          </div>
        </div>

        <GlobalFilterBar filters={filters} onChange={setFilters} />

        <div className="grid gap-4 lg:grid-cols-3">
          <InsightCanvas result={result} />
          <div className="lg:col-span-2" />
        </div>

        <ExplorerTable
          result={result}
          onDrill={handleDrill}
          maxRows={15}
        />
      </div>

      <DrillDrawer
        open={drillOpen}
        onOpenChange={setDrillOpen}
        context={drill}
      />
    </PageShell>
  );
}
