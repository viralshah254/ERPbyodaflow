"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { JoyRouteLoads } from "@/components/warehouse/JoyRouteLoads";
import { fetchSalesDocumentFlowApi } from "@/lib/api/sales-document-flow";
import { toast } from "sonner";

export default function RoutePickListsPage() {
  const [flowOn, setFlowOn] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    void fetchSalesDocumentFlowApi()
      .then((flow) => setFlowOn(flow.mode === "joy_dispatch"))
      .catch((error: Error) => toast.error(error.message));
  }, []);

  if (flowOn === null) {
    return (
      <PageShell>
        <PageHeader title="Route loads" />
      </PageShell>
    );
  }

  if (!flowOn) {
    return (
      <PageShell>
        <PageHeader
          title="Route loads"
          description="Turn on Route dispatch under Sales document flow to use this for Joy. Other organisations keep their current pick and pack."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Route loads"
        description="Choose a truck, confirm what was loaded, invoice, then mark the truck as left. Short loads go to finance first. Sales orders keep the ordered quantities."
      />
      <JoyRouteLoads />
    </PageShell>
  );
}
