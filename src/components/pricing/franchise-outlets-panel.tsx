"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchOutletsForPriceList, type PriceListOutletRow } from "@/lib/api/franchise-pricing";
import { fetchPriceListsForUi } from "@/lib/api/pricing";

export function FranchiseOutletsPanel({ priceListId }: { priceListId: string; channel?: string }) {
  const [items, setItems] = React.useState<PriceListOutletRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFranchise, setIsFranchise] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lists = await fetchPriceListsForUi();
        const pl = lists.find((l) => l.id === priceListId);
        const franchise = pl?.channel === "FRANCHISE" || pl?.channel === "Franchise";
        if (!cancelled) setIsFranchise(Boolean(franchise));
        if (!franchise) {
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        const res = await fetchOutletsForPriceList(priceListId);
        if (!cancelled) setItems(res.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [priceListId]);

  if (!loading && !isFranchise) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Franchise outlets</CardTitle>
        <CardDescription>
          Outlets assigned this list directly or via a derived child list inheriting from it as zone
          master.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading outlets…</div>
        ) : items.length === 0 ? (
          <div className="py-6 px-4 text-sm text-muted-foreground">
            No outlets assigned. Assign from{" "}
            <Link href="/franchise/network/outlets" className="text-primary underline">
              Franchise network
            </Link>
            .
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.outletOrgId}>
                  <TableCell className="font-medium">{row.outletName}</TableCell>
                  <TableCell>
                    <Badge variant={row.assignmentType === "direct" ? "default" : "secondary"}>
                      {row.assignmentType === "direct" ? "Direct" : "Derived child list"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/franchise/outlets/${row.outletOrgId}?tab=pricing`}
                      className="text-sm text-primary underline"
                    >
                      Manage pricing
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
