"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPlatformSubscriptionsApi,
  type PlatformSubscriptionRow,
} from "@/lib/api/platform";
import { CreditCard, Plus } from "lucide-react";

export default function PlatformSubscriptionsPage() {
  const [items, setItems] = React.useState<PlatformSubscriptionRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchPlatformSubscriptionsApi()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">Manage customer subscriptions and plans.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>Active and trial subscriptions by tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions yet. Create one from a customer detail or via API.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing mix</TableHead>
                  <TableHead>Pending checkout</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/platform/customers/${s.tenantId}`} className="font-medium hover:underline">
                          {s.tenantName ?? s.tenantId}
                      </Link>
                    </TableCell>
                      <TableCell>{s.orgName ?? s.orgId}</TableCell>
                    <TableCell>{s.plan}</TableCell>
                    <TableCell>{s.billingCycle}</TableCell>
                    <TableCell>{s.status}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.billingSnapshot
                          ? `${s.billingSnapshot.franchiseCount} franchise(s), ${s.billingSnapshot.activeUserCount} users, ${s.billingSnapshot.billableAdditionalUserCount} extra seats`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.pendingCheckout
                          ? `${s.pendingCheckout.itemCount} item(s) · ${new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 2,
                            }).format(s.pendingCheckout.quoteTotalCents / 100)}`
                          : "—"}
                      </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.currentPeriodStart} – {s.currentPeriodEnd}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
