"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchTransfers } from "@/lib/api/warehouse-transfers";
import { fetchCycleCountTasks, fetchPickPackTasks, fetchPutawayTasks } from "@/lib/api/warehouse-execution";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const LINKS = [
  { href: "/warehouse/transfers", label: "Transfers", desc: "Inter-warehouse transfers", icon: "Truck" as const },
  { href: "/warehouse/pick-pack", label: "Pick & Pack", desc: "Fulfill deliveries", icon: "PackageCheck" as const },
  { href: "/warehouse/putaway", label: "Putaway", desc: "Allocate received stock to bins", icon: "MapPin" as const },
  { href: "/warehouse/bin-locations", label: "Bin locations", desc: "Manage bins per warehouse", icon: "LayoutGrid" as const },
  { href: "/warehouse/cycle-counts", label: "Cycle counts", desc: "Count sessions & variance", icon: "ClipboardCheck" as const },
];

export default function WarehouseOverviewPage() {
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [inTransit, setInTransit] = React.useState(0);
  const [pendingPick, setPendingPick] = React.useState(0);
  const [awaitingPutaway, setAwaitingPutaway] = React.useState(0);
  const [openCounts, setOpenCounts] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    async function load() {
      const [transfers, pickPack, putaway, cycleCounts] = await Promise.all([
        fetchTransfers(),
        fetchPickPackTasks(),
        fetchPutawayTasks(),
        fetchCycleCountTasks(),
      ]);
      if (!active) return;
      setInTransit(transfers.filter((t) => t.status === "IN_TRANSIT").length);
      setPendingPick(pickPack.filter((p) => p.status !== "COMPLETED").length);
      setAwaitingPutaway(putaway.filter((p) => p.status !== "CONFIRMED").length);
      setOpenCounts(cycleCounts.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length);
    }
    void load().catch((error) => {
      if (!active) return;
      toast.error(error instanceof Error ? error.message : "Failed to load warehouse overview.");
      setInTransit(0);
      setPendingPick(0);
      setAwaitingPutaway(0);
      setOpenCounts(0);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Warehouse Operations"
        description="Transfers, pick/pack, putaway, cycle counts"
        breadcrumbs={[{ label: "Warehouse" }]}
        sticky
        showCommandHint
        actions={
          copilotEnabled ? (
            <Button variant="outline" size="sm" onClick={() => openWithPrompt("Explain pick/pack/putaway and suggest cycle count schedule.")}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Ask Copilot
            </Button>
          ) : undefined
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick stats</span>
          <ExplainThis prompt="Why are we stocking out on SKU X? Suggest cycle count schedule." label="Explain warehouse stats" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In transit</CardTitle>
              <Icons.Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inTransit}</div>
              <p className="text-xs text-muted-foreground">Transfers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending pick</CardTitle>
              <Icons.PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPick}</div>
              <p className="text-xs text-muted-foreground">Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting putaway</CardTitle>
              <Icons.MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{awaitingPutaway}</div>
              <p className="text-xs text-muted-foreground">GRNs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open cycle counts</CardTitle>
              <Icons.ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openCounts}</div>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.Box) as React.ComponentType<{ className?: string }>;
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
