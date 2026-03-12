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
import { getPutawayGrnById, savePutawayAllocation } from "@/lib/data/warehouse-execution.repo";
import { getMockBins } from "@/lib/mock/warehouse/bins";
import { warehousePutawayConfirm } from "@/lib/api/stub-endpoints";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PutawayDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [grn, setGrn] = React.useState(() => getPutawayGrnById(id));
  const bins = React.useMemo(() => getMockBins(), []);
  const [allocationState, setAllocationState] = React.useState<Record<string, { putawayQty: number; binCode?: string }>>({});

  React.useEffect(() => {
    const current = getPutawayGrnById(id);
    setGrn(current);
    setAllocationState(
      Object.fromEntries(
        (current?.lines ?? []).map((line) => [
          line.id,
          {
            putawayQty: line.putawayQty,
            binCode: line.allocatedBins?.[0]?.binCode,
          },
        ])
      )
    );
  }, [id]);

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
            <Button
              size="sm"
              onClick={() => {
                savePutawayAllocation(id, allocationState);
                setGrn(getPutawayGrnById(id));
                toast.success("Bin allocation saved.");
              }}
            >
              Save allocation
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await warehousePutawayConfirm(id);
                  setGrn(getPutawayGrnById(id));
                  toast.success("Putaway confirmed.");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Confirm putaway
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
            <CardDescription>Select bin and quantity for each receipt line, then confirm putaway.</CardDescription>
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
                        value={allocationState[l.id]?.putawayQty ?? l.putawayQty}
                        className="w-20"
                        min={0}
                        max={l.receivedQty}
                        onChange={(e) =>
                          setAllocationState((prev) => ({
                            ...prev,
                            [l.id]: {
                              ...prev[l.id],
                              putawayQty: Number(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={allocationState[l.id]?.binCode ?? l.allocatedBins?.[0]?.binCode}
                        onValueChange={(value) =>
                          setAllocationState((prev) => ({
                            ...prev,
                            [l.id]: {
                              putawayQty: prev[l.id]?.putawayQty ?? l.putawayQty,
                              binCode: value,
                            },
                          }))
                        }
                      >
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
        <div className="flex justify-end">
          <Button
            onClick={() => {
              savePutawayAllocation(id, allocationState);
              setGrn(getPutawayGrnById(id));
              toast.success("Putaway allocation saved.");
            }}
          >
            Save allocation
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
