"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchManufacturingMrp, type ManufacturingMrpSuggestion } from "@/lib/api/manufacturing";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";

export default function MrpPage() {
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const [itemFilter, setItemFilter] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<ManufacturingMrpSuggestion[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchManufacturingMrp();
      setSuggestions(payload.suggestions ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load MRP plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = itemFilter.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((item) =>
      [item.productSku, item.productName, item.reason].filter(Boolean).some((value) => value!.toLowerCase().includes(q))
    );
  }, [itemFilter, suggestions]);

  return (
    <PageShell>
      <PageHeader
        title="MRP"
        description="Material requirements planning — periods × items, requirements and planned orders"
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "MRP" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/boms">BOMs</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="mrp-item-filter">Filter items</Label>
            <Input
              id="mrp-item-filter"
              type="search"
              placeholder="SKU or name..."
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planning actions</CardTitle>
            <CardDescription>
              Live shortages and replenishment recommendations derived from sales-order demand, on-hand stock, and open
              work orders. Inbound stock updates when goods are received to a warehouse (post GRNs with a warehouse, and
              receive subcontract outputs into a chosen warehouse).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>On hand</TableHead>
                  <TableHead>Incoming</TableHead>
                  <TableHead>Shortage</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.type === "WORK_ORDER" ? "Make" : "Buy"}</TableCell>
                    <TableCell className="font-medium">
                      {item.productSku ? `${item.productSku} - ${item.productName}` : item.productName}
                    </TableCell>
                    <TableCell>{item.requiredQty}</TableCell>
                    <TableCell>{item.onHandQty}</TableCell>
                    <TableCell>{item.incomingQty}</TableCell>
                    <TableCell>{item.shortageQty}</TableCell>
                    <TableCell className="max-w-[420px] text-muted-foreground">{item.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {loading && <div className="p-6 text-sm text-muted-foreground">Loading MRP suggestions...</div>}
            {!loading && filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No shortages detected.</div>}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
