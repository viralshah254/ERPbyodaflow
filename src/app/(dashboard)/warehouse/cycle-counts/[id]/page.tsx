"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getMockCycleCounts } from "@/lib/mock/warehouse/cycle-counts";
import * as Icons from "lucide-react";

export default function CycleCountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const session = React.useMemo(() => getMockCycleCounts().find((c) => c.id === id), [id]);

  if (!session) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Warehouse", href: "/warehouse/overview" }, { label: "Cycle counts", href: "/warehouse/cycle-counts" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Session not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/warehouse/cycle-counts">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const hasVariance = session.lines.some((l) => l.variance !== 0);

  return (
    <PageShell>
      <PageHeader
        title={`${session.number} — ${session.status}`}
        description={`${session.warehouse} · ${session.scope}${session.scopeDetail ? ` · ${session.scopeDetail}` : ""}`}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Cycle counts", href: "/warehouse/cycle-counts" },
          { label: session.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {(session.status === "OPEN" || session.status === "IN_PROGRESS") && (
              <Button size="sm" onClick={() => window.alert("Enter quantities (stub). Scan/enter UI.")}>
                Enter quantities
              </Button>
            )}
            {session.status === "REVIEW" && hasVariance && (
              <Button size="sm" onClick={() => window.alert("Post adjustments (stub). API pending.")}>
                Post adjustments
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/cycle-counts">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variance report</CardTitle>
            <CardDescription>System vs counted. Adjust and post.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {session.lines.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No lines. Add items or scan to count.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>System qty</TableHead>
                    <TableHead>Counted qty</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.sku}</TableCell>
                      <TableCell>{l.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{l.binCode ?? "—"}</TableCell>
                      <TableCell>{l.systemQty}</TableCell>
                      <TableCell>
                        <Input type="number" defaultValue={l.countedQty} className="w-20" />
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.variance === 0 ? "secondary" : "outline"}>{l.variance >= 0 ? `+${l.variance}` : l.variance}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Save</Button>
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
