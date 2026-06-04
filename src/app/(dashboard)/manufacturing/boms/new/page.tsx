"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createManufacturingBom, fetchNextManufacturingBomCode } from "@/lib/api/manufacturing";
import { hydrateProductsFromApi, listProducts } from "@/lib/data/products.repo";
import { fetchUomsApi } from "@/lib/api/uom";
import { setUomsCache, listUoms } from "@/lib/data/uom.repo";
import type { BomType } from "@/lib/manufacturing/types";
import type { ProductRow } from "@/lib/types/masters";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

function pickKgUomCode(codes: string[]): string | undefined {
  const norm = codes.map((c) => ({ raw: c, u: c.toUpperCase().replace(/\s+/g, "") }));
  const hit =
    norm.find((x) => x.u === "KG" || x.u === "KGS" || x.u === "KG'S" || x.u === "KILOGRAM" || x.u === "KILOGRAMS");
  return hit?.raw;
}

export default function NewBomPage() {
  const router = useRouter();
  const canWrite = useCanWriteManufacturing();
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const templateId = useOrgContextStore((s) => s.templateId);
  const isCoolCatchTemplate = templateId === "cool-catch";

  if (!canWrite) {
    return <div className="p-8 text-center text-muted-foreground">You do not have write access to manufacturing.</div>;
  }

  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [uomCodes, setUomCodes] = React.useState<string[]>([]);
  const [hydrating, setHydrating] = React.useState(true);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [finishedProductId, setFinishedProductId] = React.useState<string | undefined>(undefined);
  const [quantity, setQuantity] = React.useState(1);
  const [uom, setUom] = React.useState("EA");
  const [type, setType] = React.useState<BomType>("bom");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setHydrating(true);
      try {
        await Promise.all([
          hydrateProductsFromApi(),
          fetchUomsApi().then((rows) => {
            setUomsCache(rows);
            setUomCodes(rows.map((r) => r.code));
          }),
          fetchNextManufacturingBomCode().then((c) => {
            if (!cancelled && c) setCode(c);
          }),
        ]);
        if (!cancelled) setProducts(listProducts());
      } catch {
        toast.error("Failed to load products or numbering. Retry from the BOM list.");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultsApplied = React.useRef(false);

  React.useEffect(() => {
    if (defaultsApplied.current || hydrating || uomCodes.length === 0) return;
    if (isCoolCatchTemplate) {
      const kg = pickKgUomCode(uomCodes);
      if (kg) setUom(kg);
      setType("disassembly");
    }
    defaultsApplied.current = true;
  }, [hydrating, uomCodes, isCoolCatchTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !finishedProductId) {
      if (!finishedProductId) toast.error("Select a finished product.");
      return;
    }
    try {
      const bom = await createManufacturingBom({
        name: name.trim(),
        productId: finishedProductId,
        quantity: Number(quantity) || 1,
        uom: uom || "EA",
        type,
      });
      toast.success(`BOM ${bom.code ?? bom.id} created.`);
      router.push(`/manufacturing/boms/${bom.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create BOM.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="New BOM"
        description="Create a bill of material or formula"
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: "BOMs", href: "/manufacturing/boms" },
          { label: "New" },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/boms">Cancel</Link>
          </Button>
        }
      />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>BOM details</CardTitle>
            <CardDescription>Code, name, finished product, quantity, and type.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    readOnly
                    aria-readonly="true"
                    value={hydrating ? "…" : code}
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Assigned from numbering sequence when you save (shown as next available).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Widget A" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Finished product</Label>
                <Select
                  disabled={hydrating || products.length === 0}
                  value={finishedProductId}
                  onValueChange={setFinishedProductId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={hydrating ? "Loading products…" : products.length ? "Select product" : "No products — add catalog items first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={quantity}
                    onChange={(e) => setQuantity(Number((e.target as HTMLInputElement).value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UOM</Label>
                  <Select
                    disabled={hydrating || uomCodes.length === 0}
                    value={uom}
                    onValueChange={setUom}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={uomCodes.length ? undefined : "Loading UOMs…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(uomCodes.length ? uomCodes : listUoms().map((u) => u.code)).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as BomType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">BOM (Standard assembly)</SelectItem>
                    <SelectItem value="formula">Formula (Batch / process)</SelectItem>
                    <SelectItem value="disassembly">Disassembly (Reverse — one input → many outputs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={hydrating}>
                  <Icons.Check className="mr-2 h-4 w-4" />
                  Create BOM
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/manufacturing/boms">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
