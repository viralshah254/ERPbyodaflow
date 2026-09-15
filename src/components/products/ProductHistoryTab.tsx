"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchInventoryMovementsApi,
  fetchStockLevelsApi,
  type InventoryStockRow,
} from "@/lib/api/inventory-stock";
import type { MovementRow } from "@/lib/types/inventory";
import { toast } from "sonner";

function movementHref(row: MovementRow): string | null {
  if (!row.sourceId || !row.sourceType) return null;
  const type = row.sourceType.toLowerCase().replace(/_/g, "-");
  if (type === "adjustment" || type === "adjust") return null;
  if (type === "transfer") return "/inventory/movements";
  return `/docs/${type}/${row.sourceId}`;
}

export function ProductHistoryTab(props: { productId: string }) {
  const [stock, setStock] = React.useState<InventoryStockRow[]>([]);
  const [movements, setMovements] = React.useState<MovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchStockLevelsApi({ productId: props.productId, limit: 100 }).catch(() => []),
      fetchInventoryMovementsApi({ productId: props.productId, limit: 100 }).catch(() => []),
    ])
      .then(([stockRows, movementRows]) => {
        if (cancelled) return;
        setStock(stockRows);
        setMovements(movementRows);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message || "Failed to load product history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.productId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading inventory history…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On hand by warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          {stock.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock levels recorded for this product.</p>
          ) : (
            <div className={LIST_TABLE_SURFACE_CLASS}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.warehouseId ? (
                          <Link href={`/inventory/stock-levels/${row.id}`} className="hover:underline">
                            {row.warehouse}
                          </Link>
                        ) : (
                          row.warehouse
                        )}
                      </TableCell>
                      <TableCell>{row.location || "—"}</TableCell>
                      <TableCell className="text-right">
                        {row.quantity} {row.uom ?? ""}
                      </TableCell>
                      <TableCell className="text-right">{row.reserved}</TableCell>
                      <TableCell className="text-right">{row.available}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {movements.length === 0 ? (
        <EmptyState
          icon="History"
          title="No stock movements"
          description="Posted GRNs, invoices, transfers, and adjustments create inventory movements. Draft documents do not."
        />
      ) : (
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((row) => {
                const href = movementHref(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.type}</Badge>
                    </TableCell>
                    <TableCell>{row.warehouse}</TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell>
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {row.reference || row.sourceType || "Open"}
                        </Link>
                      ) : (
                        row.reference || row.sourceType || "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
