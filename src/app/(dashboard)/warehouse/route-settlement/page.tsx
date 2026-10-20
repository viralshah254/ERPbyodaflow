"use client";

import * as React from "react";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveRouteSettlementApi,
  createRouteSettlementApi,
  fetchRouteSettlementsApi,
  type RouteSettlementRow,
} from "@/lib/api/route-settlement";
import { toast } from "sonner";

export default function RouteSettlementPage() {
  const [rows, setRows] = React.useState<RouteSettlementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [routeDate, setRouteDate] = React.useState("");
  const [driverId, setDriverId] = React.useState("");
  const [expected, setExpected] = React.useState("");
  const [cash, setCash] = React.useState("");
  const [mpesa, setMpesa] = React.useState("");
  const [returnsAmount, setReturnsAmount] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchRouteSettlementsApi());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load route settlements.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Route settlement"
        description="Cash, M-Pesa, and returns for a driver. A variance needs a supervisor who is not that driver."
        breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Route settlement" }]}
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <form
          className="mb-4 grid gap-3 sm:grid-cols-3"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await createRouteSettlementApi({
                routeDate,
                driverId,
                expected: Number(expected) || 0,
                cash: Number(cash) || 0,
                mpesa: Number(mpesa) || 0,
                returnsAmount: Number(returnsAmount) || 0,
              });
              toast.success("Settlement opened.");
              setDriverId("");
              await reload();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not open the settlement.");
            }
          }}
        >
          <div className="space-y-1"><Label htmlFor="route-date">Route date</Label><Input id="route-date" type="date" value={routeDate} onChange={(event) => setRouteDate(event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="driver-id">Driver id</Label><Input id="driver-id" value={driverId} onChange={(event) => setDriverId(event.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="expected">Expected</Label><Input id="expected" type="number" value={expected} onChange={(event) => setExpected(event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="cash">Cash</Label><Input id="cash" type="number" value={cash} onChange={(event) => setCash(event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="mpesa">M-Pesa</Label><Input id="mpesa" type="number" value={mpesa} onChange={(event) => setMpesa(event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="returns">Returns</Label><Input id="returns" type="number" value={returnsAmount} onChange={(event) => setReturnsAmount(event.target.value)} /></div>
          <Button type="submit" className="sm:col-span-3 sm:w-fit">Open settlement</Button>
        </form>
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <DataTable
            data={rows}
            emptyMessage={loading ? "Loading settlements…" : "No settlements."}
            columns={[
              { id: "date", header: "Date", accessor: "routeDate" },
              { id: "driver", header: "Driver", accessor: "driverId" },
              { id: "expected", header: "Expected", accessor: (row) => row.expected.toLocaleString() },
              { id: "collected", header: "Collected", accessor: (row) => (row.cash + row.mpesa + row.returnsAmount).toLocaleString() },
              { id: "status", header: "Status", accessor: "status" },
              {
                id: "approve",
                header: "",
                accessor: (row) => row.status === "OPEN" ? (
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      await approveRouteSettlementApi(row._id);
                      toast.success("Settlement closed.");
                      await reload();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not approve the variance.");
                    }
                  }}>Approve</Button>
                ) : null,
              },
            ]}
          />
        </div>
      </div>
    </PageShell>
  );
}
