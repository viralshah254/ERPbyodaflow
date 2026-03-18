"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSubcontractOrders,
  fetchExternalWorkCenters,
  receiveSubcontractOrder,
  type SubcontractOrderRow,
  type ExternalWorkCenterRow,
} from "@/lib/api/cool-catch";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function statusVariant(status: SubcontractOrderRow["status"]): "default" | "secondary" | "outline" {
  if (status === "RECEIVED") return "default";
  if (status === "WIP") return "secondary";
  return "outline";
}

export default function SubcontractOrdersListPage() {
  const [orders, setOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [workCenters, setWorkCenters] = React.useState<ExternalWorkCenterRow[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [workCenterFilter, setWorkCenterFilter] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [receivingId, setReceivingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchSubcontractOrders({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(workCenterFilter ? { workCenterId: workCenterFilter } : {}),
      }).then(setOrders),
      fetchExternalWorkCenters().then(setWorkCenters),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load subcontract orders");
      });
  }, [statusFilter, workCenterFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleReceive = async (order: SubcontractOrderRow) => {
    if (order.status !== "WIP") return;
    setReceivingId(order.id);
    try {
      await receiveSubcontractOrder(order.id);
      toast.success("Order marked received.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceivingId(null);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "number",
        header: "Order",
        accessor: (r: SubcontractOrderRow) => (
          <Link
            href={`/manufacturing/subcontracting/orders/${r.id}`}
            className="font-medium hover:underline"
          >
            {r.number}
          </Link>
        ),
        sticky: true,
      },
      {
        id: "workCenter",
        header: "Work center",
        accessor: (r: SubcontractOrderRow) => r.workCenterName,
      },
      {
        id: "bom",
        header: "BOM",
        accessor: (r: SubcontractOrderRow) => r.bomName ?? "—",
      },
      {
        id: "status",
        header: "Status",
        accessor: (r: SubcontractOrderRow) => (
          <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
        ),
      },
      {
        id: "sentAt",
        header: "Sent",
        accessor: (r: SubcontractOrderRow) =>
          r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—",
      },
      {
        id: "receivedAt",
        header: "Received",
        accessor: (r: SubcontractOrderRow) =>
          r.receivedAt ? new Date(r.receivedAt).toLocaleDateString() : "—",
      },
      {
        id: "actions",
        header: "",
        accessor: (r: SubcontractOrderRow) => (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/manufacturing/subcontracting/orders/${r.id}`}>View</Link>
            </Button>
            {r.status === "WIP" && (
              <Button
                size="sm"
                variant="outline"
                disabled={receivingId === r.id}
                onClick={() => handleReceive(r)}
              >
                {receivingId === r.id ? "Receiving…" : "Receive"}
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receivingId]
  );

  return (
    <PageShell>
      <PageHeader
        title="Subcontract Orders"
        description="All orders sent to external processors — factories and women's groups"
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Subcontracting", href: "/manufacturing/subcontracting" },
          { label: "Orders" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/manufacturing/subcontracting">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Send to processor
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="WIP">WIP</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={workCenterFilter || "all"}
            onValueChange={(v) => setWorkCenterFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All work centers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All work centers</SelectItem>
              {workCenters.map((wc) => (
                <SelectItem key={wc.id} value={wc.id}>
                  {wc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={load} title="Refresh">
            <Icons.RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
            ) : (
              <DataTable<SubcontractOrderRow>
                data={orders}
                columns={columns}
                emptyMessage="No subcontract orders found. Use 'Send to processor' to create one."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
