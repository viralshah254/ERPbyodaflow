"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMockPutaway } from "@/lib/mock/warehouse/putaway";
import { getMockBins } from "@/lib/mock/warehouse/bins";
import * as Icons from "lucide-react";

export default function PutawayDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const grn = React.useMemo(() => getMockPutaway().find((g) => g.id === id), [id]);
  const bins = React.useMemo(() => getMockBins(), []);

  if (!grn) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Putaway", href: "/warehouse/putaway" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">GRN not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/putaway">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`Putaway — ${grn.grnNumber}`}
        description={grn.warehouse}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Putaway", href: "/warehouse/putaway" },
          { label: grn.grnNumber },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.alert("Allocate to bins (stub). API pending.")}>
              Save allocation
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/putaway">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lines — allocate to bin</CardTitle>
            <CardDescription>Select bin and qty per line. Stub.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Putaway</TableHead>
                  <TableHead>Bin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.sku}</TableCell>
                    <TableCell>{l.productName}</TableCell>
                    <TableCell>{l.receivedQty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={l.putawayQty}
                        className="w-20"
                        min={0}
                        max={l.receivedQty}
                      />
                    </TableCell>
                    <TableCell>
                      <Select defaultValue={l.allocatedBins?.[0]?.binCode}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select bin" />
                        </SelectTrigger>
                        <SelectContent>
                          {bins.filter((b) => b.warehouse === grn.warehouse).map((b) => (
                            <SelectItem key={b.id} value={b.code}>{b.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
