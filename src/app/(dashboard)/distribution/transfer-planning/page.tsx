"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";

const planningRows = [
  { lane: "Nairobi Hub -> Nairobi West Outlet", sku: "FILLET-001", availableKg: 420, requestedKg: 155, truckType: "LEASED", eta: "Today 16:00" },
  { lane: "Nairobi Hub -> Kisumu Central", sku: "FILLET-001", availableKg: 420, requestedKg: 88, truckType: "SPOT_HIRE", eta: "Tomorrow 09:00" },
  { lane: "Processor A -> Nairobi Hub", sku: "GUTTED-001", availableKg: 260, requestedKg: 210, truckType: "LEASED", eta: "Today 20:00" },
];

export default function TransferPlanningPage() {
  const columns = [
    { id: "lane", header: "Lane", accessor: (r: (typeof planningRows)[number]) => r.lane, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: (typeof planningRows)[number]) => r.sku },
    { id: "available", header: "Available kg", accessor: (r: (typeof planningRows)[number]) => r.availableKg },
    { id: "requested", header: "Requested kg", accessor: (r: (typeof planningRows)[number]) => r.requestedKg },
    { id: "truck", header: "Truck type", accessor: (r: (typeof planningRows)[number]) => r.truckType },
    { id: "eta", header: "ETA", accessor: (r: (typeof planningRows)[number]) => r.eta },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Transfer Planning"
        description="Plan hub, processor, and franchise transfers with truck assignment and quantity checks."
        breadcrumbs={[{ label: "Distribution", href: "/distribution/trips" }, { label: "Transfer Planning" }]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/distribution/trips">Open Trips</Link>
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Planning workspace</CardTitle>
            <CardDescription>Phase 1 transfer planner scaffold using mocked lanes and quantities.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={planningRows} columns={columns} emptyMessage="No transfer plans." />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

