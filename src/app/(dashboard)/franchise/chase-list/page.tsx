"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchHqChaseList, type ChaseListItem } from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";

export default function FranchiseChaseListPage() {
  const [items, setItems] = React.useState<ChaseListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows } = await fetchHqChaseList();
      setItems(rows ?? []);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load chase lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PageShell>
      <PageHeader
        title="Franchise chase lists"
        description="NFC/BD leads routed to outlet chase lists for franchise follow-up."
        breadcrumbs={[
          { label: "Franchise", href: "/franchise/network/outlets" },
          { label: "Chase lists" },
        ]}
        sticky
        actions={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>HQ view (NFC source)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No NFC leads yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>BD rep</TableHead>
                    <TableHead>Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                      <TableCell>{row.assignedOutletName ?? row.assignedOutletOrgId ?? "—"}</TableCell>
                      <TableCell>{row.bdRepName ?? "—"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.capturedAt
                          ? new Date(row.capturedAt).toLocaleString("en-KE")
                          : new Date(row.createdAt).toLocaleString("en-KE")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
