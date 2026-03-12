"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fetchStockLevelApi,
  fetchStockLevelsApi,
  type InventoryStockRow,
} from "@/lib/api/inventory-stock";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function StockLevelDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = React.useState<InventoryStockRow | null | undefined>(undefined);
  const [otherLocations, setOtherLocations] = React.useState<InventoryStockRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const found = await fetchStockLevelApi(id);
        if (cancelled) return;
        setItem(found ?? null);
        const relatedProductId = found?.productId ?? found?.sku;
        if (found && relatedProductId) {
          const related = await fetchStockLevelsApi({ productId: relatedProductId });
          if (!cancelled) {
            setOtherLocations(related.filter((row) => row.id !== found.id));
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast.error((error as Error).message);
          setItem(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (item === undefined) {
    return (
      <PageShell>
        <PageHeader
          title="Stock"
          breadcrumbs={[
            { label: "Inventory", href: "/inventory/stock-levels" },
            { label: "Stock Levels", href: "/inventory/stock-levels" },
            { label: "…" },
          ]}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  if (item === null) {
    return (
      <PageShell>
        <PageHeader
          title="Stock not found"
          breadcrumbs={[
            { label: "Inventory", href: "/inventory/stock-levels" },
            { label: "Stock Levels", href: "/inventory/stock-levels" },
            { label: id },
          ]}
        />
        <div className="p-6">
          <p className="text-muted-foreground">Stock record not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/inventory/stock-levels">Back to stock levels</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`${item.sku} — ${item.name}`}
        description={`${item.warehouse}${item.location ? ` · ${item.location}` : ""}`}
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/stock-levels" },
          { label: "Stock Levels", href: "/inventory/stock-levels" },
          { label: item.sku },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/inventory/stock-levels`}>Back to list</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/inventory/movements?productId=${encodeURIComponent(item.productId ?? item.sku)}`}>View movements</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/inventory/stock-levels?adjust=${item.id}`}>Stock adjustment</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock at this location</CardTitle>
            <CardDescription>
              {item.warehouse}
              {item.location ? ` · Location ${item.location}` : ""}
              {item.category ? ` · ${item.category}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantity</dt>
                <dd className="text-xl font-semibold mt-0.5">{item.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reserved</dt>
                <dd className="text-xl font-semibold mt-0.5 text-muted-foreground">{item.reserved}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available</dt>
                <dd className="text-xl font-semibold mt-0.5 text-primary">{item.available}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reorder level</dt>
                <dd className="text-xl font-semibold mt-0.5">{item.reorderLevel}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={item.status} />
              </dd>
            </div>
          </CardContent>
        </Card>

        {otherLocations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Same SKU at other locations</CardTitle>
              <CardDescription>Stock for {item.sku} in other warehouses.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherLocations.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.warehouse}</TableCell>
                      <TableCell>{row.location ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.reserved}</TableCell>
                      <TableCell className="text-right font-medium">{row.available}</TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/inventory/stock-levels/${row.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
