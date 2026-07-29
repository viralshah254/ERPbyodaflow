"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OdaflowSyncQueuePanel } from "@/components/integrations/OdaflowSyncQueuePanel";
import { subscribeRealtimeInbox } from "@/lib/realtime-client";
import { fetchOdaflowSyncStatus } from "@/lib/api/odaflow-integration";
import * as Icons from "lucide-react";

export default function OdaflowSyncQueuePage() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);

  const refreshSummary = React.useCallback(async () => {
    try {
      const status = await fetchOdaflowSyncStatus();
      setPendingCount(status.queueSummary.pending);
    } catch {
      setPendingCount(null);
    }
  }, []);

  React.useEffect(() => {
    void refreshSummary();
  }, [refreshSummary, refreshKey]);

  React.useEffect(() => {
    return subscribeRealtimeInbox((event) => {
      if (event === "odaflow.sync-queue.changed") {
        setRefreshKey((k) => k + 1);
      }
    });
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Failed Odaflow orders"
        description="Orders from Odaflow that need a quick review. Open one, match the customer and products, then send it to Sales Orders."
        breadcrumbs={[
          { label: "Sales", href: "/sales/orders" },
          { label: "Failed Odaflow orders" },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/integrations/odaflow">
              <Icons.Settings className="mr-2 h-4 w-4" />
              Connector settings
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {pendingCount != null && pendingCount > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-50">
            <strong className="font-medium">{pendingCount} order{pendingCount === 1 ? "" : "s"}</strong> from Odaflow
            need review before they can appear in Sales Orders.
          </div>
        )}

        <OdaflowSyncQueuePanel
          refreshKey={refreshKey}
          onQueueChanged={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
    </PageShell>
  );
}
