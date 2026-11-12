"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchInventoryMovementsApi,
  fetchStockLevelsApi,
  type InventoryStockRow,
} from "@/lib/api/inventory-stock";
import { stockMovementSourceHref, warehouseStockStateLabel, type MovementRow } from "@/lib/types/inventory";
import { Button } from "@/components/ui/button";

export function ProductHistoryTab(props: { productId: string }) {
  const [stock, setStock] = React.useState<InventoryStockRow[]>([]);
  const [movements, setMovements] = React.useState<MovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stockError, setStockError] = React.useState(false);
  const [movementError, setMovementError] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      fetchStockLevelsApi({ productId: props.productId, limit: 100 }),
      fetchInventoryMovementsApi({ productId: props.productId, limit: 100 }),
    ])
      .then(([stockRows, movementRows]) => {
        if (cancelled) return;
        setStockError(stockRows.status === "rejected");
        setMovementError(movementRows.status === "rejected");
        setStock(stockRows.status === "fulfilled" ? stockRows.value : []);
        setMovements(movementRows.status === "fulfilled" ? movementRows.value : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.productId, refresh]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading inventory history…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On hand by warehouse</CardTitle>
          <CardDescription>Unreserved stock can still be subject to lot quality and expiry checks.</CardDescription>
        </CardHeader>
        <CardContent>
          {stockError ? (
            <p role="alert" className="text-sm">Could not load warehouse stock. <Button variant="link" size="sm" onClick={() => setRefresh((value) => value + 1)}>Retry</Button></p>
          ) : stock.length === 0 ? (
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
                    <TableHead className="text-right">Unreserved</TableHead>
                    <TableHead>Warehouse status</TableHead>
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
                      <TableCell className="text-right">{row.warehouseStockBlocked ? "—" : row.available}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{warehouseStockStateLabel(row.warehouseStockState)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <h3 className="text-base font-semibold">Stock movement history</h3>
      {movementError ? (
        <p role="alert" className="text-sm">Could not load stock movements. <Button variant="link" size="sm" onClick={() => setRefresh((value) => value + 1)}>Retry</Button></p>
      ) : movements.length === 0 ? (
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
                const href = stockMovementSourceHref(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.type}</Badge>
                    </TableCell>
                    <TableCell>{row.warehouse}</TableCell>
                    <TableCell className="text-right">{row.quantity > 0 ? "+" : ""}{row.quantity}{row.uom ? ` ${row.uom}` : ""}</TableCell>
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
