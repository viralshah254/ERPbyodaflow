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
import { fetchCycleCountTask, submitCycleCountTask, approveCycleCountTask, cancelCycleCountTask, updateCycleCountTaskLine, type WarehouseCycleCountRow } from "@/lib/api/warehouse-execution";
import { useCanWriteInventory, useHasPermission } from "@/lib/rbac/use-write-guard";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function CycleCountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const canWrite = useCanWriteInventory();
  const canApprove = useHasPermission("finance.approve");
  const [busy, setBusy] = React.useState(false);
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
  const editable = canWrite && ["DRAFT", "IN_PROGRESS"].includes(task.status);
  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try { await action(); toast.success(message); await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Count action failed."); }
    finally { setBusy(false); }
  };

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
            {editable && <Button disabled={busy} variant="secondary" onClick={() => void act(() => submitCycleCountTask(task.id), task.requiresApproval ? "Count submitted for independent approval." : "Count submitted.")}>
              {task.requiresApproval ? "Submit for approval" : "Submit count"}
            </Button>}
            {canApprove && task.status === "PENDING_APPROVAL" && <Button disabled={busy} onClick={() => void act(() => approveCycleCountTask(task.id), "Count approved. Stock and accounting posted together.")}>Approve & post</Button>}
            {canWrite && task.requiresApproval && ["DRAFT", "IN_PROGRESS", "PENDING_APPROVAL"].includes(task.status) && <Button disabled={busy} variant="outline" onClick={() => void act(() => cancelCycleCountTask(task.id), "Unposted count cancelled. Create a new session for a fresh count.")}>Cancel count</Button>}
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/cycle-counts">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        {task.requiresApproval && <p className="text-sm text-muted-foreground">A second authorized person must approve differences. Stock movements or cost changes after counting require a fresh review. Values below are in KES.</p>}
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
                  <TableHead>Lot</TableHead>
                  <TableHead>System qty</TableHead>
                  <TableHead>Counted qty</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Variance value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.sku ?? "—"}</TableCell>
                    <TableCell>{line.productName ?? line.productId}</TableCell>
                    <TableCell>{line.locationCode ?? "—"}</TableCell>
                    <TableCell>{line.lotNumber ?? "—"}</TableCell>
                    <TableCell>{line.systemQty}</TableCell>
                    <TableCell>
                      <Input
                        className="w-24"
                        key={`${line.id}:${line.countedQty}`}
                        type="number" min="0" step="any"
                        defaultValue={String(line.countedQty)} disabled={!editable || busy}
                        onBlur={(e) => {
                          const value = Number(e.currentTarget.value);
                          if (!e.currentTarget.value || !Number.isFinite(value) || value < 0) { e.currentTarget.value = String(line.countedQty); toast.error("Enter a non-negative count."); return; }
                          if (value !== line.countedQty) void act(() => updateCycleCountTaskLine(task.id, line.id, value), "Count saved.");
                        }}
                      />
                    </TableCell>
                    <TableCell>{line.variance >= 0 ? `+${line.variance}` : line.variance}</TableCell>
                    <TableCell>{line.varianceValue == null ? "On submission" : formatMoney(line.varianceValue, "KES")}</TableCell>
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
