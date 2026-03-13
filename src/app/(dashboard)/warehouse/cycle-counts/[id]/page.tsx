"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCycleCountTask, submitCycleCountTask, updateCycleCountTaskLine, type WarehouseCycleCountRow } from "@/lib/api/warehouse-execution";
import { toast } from "sonner";

export default function CycleCountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = React.useState<WarehouseCycleCountRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchCycleCountTask(id);
      setTask(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load cycle count.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!task && loading) return <PageShell><PageHeader title="Loading cycle count..." /></PageShell>;
  if (!task) return <PageShell><PageHeader title="Cycle count not found" /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title={`${task.number} - ${task.status}`}
        description={task.warehouse}
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Cycle counts", href: "/warehouse/cycle-counts" },
          { label: task.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={async () => {
              await submitCycleCountTask(task.id);
              toast.success("Cycle count posted.");
              await refresh();
            }}>
              Submit & post
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/cycle-counts">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Count lines</CardTitle>
            <CardDescription>Update counted quantities; variance is recalculated from backend data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>System qty</TableHead>
                  <TableHead>Counted qty</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.sku ?? "—"}</TableCell>
                    <TableCell>{line.productName ?? line.productId}</TableCell>
                    <TableCell>{line.locationCode ?? "—"}</TableCell>
                    <TableCell>{line.systemQty}</TableCell>
                    <TableCell>
                      <Input
                        className="w-24"
                        value={String(line.countedQty)}
                        onChange={async (e) => {
                          await updateCycleCountTaskLine(task.id, line.id, Number(e.target.value) || 0);
                          await refresh();
                        }}
                      />
                    </TableCell>
                    <TableCell>{line.variance >= 0 ? `+${line.variance}` : line.variance}</TableCell>
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
