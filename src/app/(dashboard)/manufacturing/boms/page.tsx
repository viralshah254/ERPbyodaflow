"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { fetchManufacturingBoms, type ManufacturingBom } from "@/lib/api/manufacturing";
import { manufacturingAreaLabel, t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type BomRow = {
  id: string;
  code: string;
  name: string;
  finishedProduct: string;
  quantity: number;
  uom: string;
  version: string;
  type: "bom" | "formula" | "disassembly";
  isActive: boolean;
};

export default function BomsPage() {
  const router = useRouter();
  const terminology = useTerminology();
  const bomLabel = t("bom", terminology);
  const areaLabel = manufacturingAreaLabel(terminology);
  const [boms, setBoms] = React.useState<ManufacturingBom[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchManufacturingBoms()
      .then((items) => {
        if (!cancelled) setBoms(items);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load BOMs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: BomRow[] = React.useMemo(
    () =>
      boms.map((b) => {
        return {
          id: b.id,
          code: b.code,
          name: b.name,
          finishedProduct: b.finishedProductSku
            ? `${b.finishedProductSku} — ${b.finishedProductName ?? b.finishedProductId}`
            : b.finishedProductName ?? b.finishedProductId,
          quantity: b.quantity,
          uom: b.uom,
          version: b.version,
          type: b.type,
          isActive: b.isActive,
        };
      }),
    [boms]
  );

  const columns = [
    {
      id: "code",
      header: "Code",
      accessor: (r: BomRow) => (
        <Link href={`/manufacturing/boms/${r.id}`} className="font-medium text-primary hover:underline">
          {r.code}
        </Link>
      ),
      sticky: true,
    },
    { id: "name", header: "Name", accessor: "name" as keyof BomRow },
    { id: "finishedProduct", header: "Finished product", accessor: "finishedProduct" as keyof BomRow },
    { id: "qty", header: "Qty", accessor: (r: BomRow) => `${r.quantity} ${r.uom}` },
    { id: "version", header: "Version", accessor: "version" as keyof BomRow },
    {
      id: "type",
      header: "Type",
      accessor: (r: BomRow) => {
        const variant = r.type === "formula" ? "secondary" : r.type === "disassembly" ? "default" : "outline";
        const label = r.type === "disassembly" ? "Disassembly" : r.type === "formula" ? "Formula" : "BOM";
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: BomRow) => (r.isActive ? "Active" : "Inactive"),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title={`Bills of Material (${bomLabel})`}
        description="Define product structures, formulas, and cost rollup"
        breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: "BOMs" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/routing">Routing</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/mrp">MRP</Link>
            </Button>
            <Button size="sm" onClick={() => router.push("/manufacturing/boms/new")} data-tour-step="create-button">
              <Icons.Plus className="mr-2 h-4 w-4" />
              New BOM
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>BOM list</CardTitle>
            <CardDescription>Standard BOMs and formulas. Open to edit components, batch size, co-/by-products.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={rows}
              columns={columns}
              emptyMessage={loading ? "Loading BOMs..." : "No BOMs yet. Create one to get started."}
              onRowClick={(r) => router.push(`/manufacturing/boms/${r.id}`)}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
