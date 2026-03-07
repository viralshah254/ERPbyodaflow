"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchYieldById } from "@/lib/api/yield";
import type { YieldRecordRow } from "@/lib/api/yield";
import * as Icons from "lucide-react";

export default function YieldDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [record, setRecord] = React.useState<YieldRecordRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchYieldById(id).then((r) => { setRecord(r ?? null); setLoading(false); });
  }, [id]);

  if (loading && !record) {
    return (
      <PageShell>
        <PageHeader title="Yield" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/boms" }, { label: "Yield", href: "/manufacturing/yield" }, { label: id }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }
  if (record === null) {
    return (
      <PageShell>
        <PageHeader title="Yield not found" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/boms" }, { label: "Yield", href: "/manufacturing/yield" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Yield record not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/manufacturing/yield">Back to yield</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={`Yield ${record.id}`}
        description={record.workOrderNumber ?? record.subcontractOrderId ?? record.recordedAt}
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Yield", href: "/manufacturing/yield" },
          { label: record.id },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/yield">Back to list</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Input and output weights</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Recorded</p>
              <p className="font-medium">{new Date(record.recordedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Input (kg)</p>
              <p className="font-medium">{record.inputWeightKg}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Primary (kg)</p>
              <p className="font-medium">{record.outputPrimaryKg}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Secondary (kg)</p>
              <p className="font-medium">{record.outputSecondaryKg}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Waste (kg)</p>
              <p className="font-medium">{record.wasteKg}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Yield %</p>
              <p className="font-medium">{record.yieldPercent != null ? `${record.yieldPercent}%` : "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output lines</CardTitle>
            <CardDescription>Primary, secondary, waste by SKU</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">{line.skuCode}</TableCell>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>
                      <Badge variant={line.type === "PRIMARY" ? "default" : "secondary"}>{line.type}</Badge>
                    </TableCell>
                    <TableCell>{line.quantityKg} {line.uom}</TableCell>
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
