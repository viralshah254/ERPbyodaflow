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
import {
  AsyncSearchableSelect,
  type AsyncSearchableSelectOption,
} from "@/components/ui/async-searchable-select";
import { createManufacturingBom, fetchNextManufacturingBomCode } from "@/lib/api/manufacturing";
import { fetchProductsPageApi } from "@/lib/api/products";
import { productSearchLabel } from "@/lib/products/product-search";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import { fetchUomsApi } from "@/lib/api/uom";
import { fetchWarehousesApi, type BackendWarehouse } from "@/lib/api/warehouses";
import { setUomsCache, listUoms } from "@/lib/data/uom.repo";
import type { BomType } from "@/lib/manufacturing/types";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { productionTerms } from "@/lib/manufacturing/production-language";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing, useSessionReady } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import * as Icons from "lucide-react";

import { BomPilotHelp } from "@/components/manufacturing/BomPilotHelp";

function pickKgUomCode(codes: string[]): string | undefined {
  const norm = codes.map((c) => ({ raw: c, u: c.toUpperCase().replace(/\s+/g, "") }));
  const hit =
    norm.find((x) => x.u === "KG" || x.u === "KGS" || x.u === "KG'S" || x.u === "KILOGRAM" || x.u === "KILOGRAMS");
  return hit?.raw;
}

export default function NewBomPage() {
  const router = useRouter();
  const canWrite = useCanWriteManufacturing();
  const sessionReady = useSessionReady();
  const terminology = useTerminology();
  const areaLabel = manufacturingAreaLabel(terminology);
  const templateId = useOrgContextStore((s) => s.templateId);
  const terms = productionTerms(templateId);
  const isCoolCatchTemplate = templateId === "cool-catch";

  const [uomCodes, setUomCodes] = React.useState<string[]>([]);
  const [hydrating, setHydrating] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [loadAttempt, setLoadAttempt] = React.useState(0);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [finishedProductId, setFinishedProductId] = React.useState<string | undefined>(undefined);
  const [finishedProductOption, setFinishedProductOption] =
    React.useState<AsyncSearchableSelectOption | null>(null);
  const [quantity, setQuantity] = React.useState("1");
  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const submitting = React.useRef(false);
  const [uom, setUom] = React.useState("EA");
  const [type, setType] = React.useState<BomType>("bom");
  const [outputWarehouseId, setOutputWarehouseId] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<BackendWarehouse[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setHydrating(true);
      setLoadError(false);
      try {
        await Promise.all([
          fetchUomsApi().then((rows) => {
            setUomsCache(rows);
            setUomCodes(rows.map((r) => r.code));
          }),
          fetchNextManufacturingBomCode().then((c) => {
            if (!cancelled && c) setCode(c);
          }),
          fetchWarehousesApi().then((rows) => {
            if (!cancelled) setWarehouses(rows.filter((row) => row.status !== "INACTIVE"));
          }),
        ]);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

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

  const loadFinishedProducts = React.useCallback(async (query: string) => {
    const page = await fetchProductsPageApi({
      search: query.trim() || undefined,
      limit: 50,
      includeStock: false,
    });
    return page.items.map((product) => ({
      id: product.id,
      label: productSearchLabel(product),
      labelClassName: CAPS_ON_PRODUCT_CLASS,
      description: [product.size?.trim(), product.barcode?.trim()].filter(Boolean).join(" · ") || undefined,
    }));
  }, []);

  if (!sessionReady) return null;

  if (!canWrite) {
    return <div className="p-8 text-center text-muted-foreground">You do not have write access to manufacturing.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || hydrating) return;
    setSubmitError("");
    if (loadError || !uomCodes.includes(uom)) {
      setSubmitError("Load setup data and select an available output unit before creating the BOM.");
      return;
    }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) < 0.001) {
      setSubmitError("Enter a batch output of at least 0.001.");
      return;
    }
    if (!name.trim() || !finishedProductId) {
      setSubmitError(!finishedProductId ? "Select a finished product." : `Enter a ${terms.formula} name.`);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const bom = await createManufacturingBom({
        name: name.trim(),
        productId: finishedProductId,
        quantity: Number(quantity),
        uom: uom || "EA",
        type,
        ...(outputWarehouseId ? { outputWarehouseId } : {}),
      });
      toast.success(`${terms.formulaTitle} ${bom.code ?? bom.id} created.`);
      router.push(`/manufacturing/boms/${encodeURIComponent(bom.id)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create BOM.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={terms.newFormula}
        description={`Step 1: name the ${terms.formula} and its finished product. Add components after it is created.`}
        help={<BomPilotHelp screen="new" steps={[
          { id: "identity", target: "[data-bom-identity]", title: "Name this recipe", description: "Give the BOM a recognizable name. The code shown is a preview; the numbering sequence assigns the final code on save.", instruction: "Enter a recipe name.", complete: !!name.trim() },
          { id: "product", target: "[data-bom-product]", title: "Choose the finished product", description: "Search the product catalogue and select the SKU this recipe describes. Components are added on the next screen, not in this picker.", instruction: "Select a finished product from the catalogue.", complete: !!finishedProductId },
          { id: "output", target: "[data-bom-output]", title: "Define one batch", description: "Quantity and unit describe the batch output, not a component quantity. For example, 10 KG is a ten-kilogram batch. Check the unit before continuing.", instruction: "Confirm a positive output quantity and a loaded unit.", complete: Number.isFinite(Number(quantity)) && Number(quantity) >= 0.001 && uomCodes.includes(uom) },
          { id: "type", target: "[data-bom-type]", title: "Choose the production method", description: isCoolCatchTemplate ? "This template defaults to Disassembly and kilograms when available. Check that this matches your reverse process." : "Use BOM for standard assembly, Formula for batch production, or Disassembly for a reverse process. Select the method that matches the production task." },
          { id: "warehouse", target: "[data-bom-warehouse]", title: "Set the output destination", description: "Choose the warehouse where finished goods should be received, or leave the destination to the work order. Choosing a warehouse here does not move stock." },
          { id: "review", target: "[data-bom-review]", title: "Review before creating", description: "Check the summary and any validation message. Create BOM saves a real recipe, then opens its record so you can add components and routing. Finish walkthrough only ends this guide; it does not submit the form." },
        ]} />}
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: terms.formulasTitle, href: "/manufacturing/boms" },
          { label: "New" },
        ]}
        sticky
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/manufacturing/boms">Cancel</Link>
          </Button>
        }
      />
      <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          <CardHeader>
            <CardTitle>Define your batch</CardTitle>
            <CardDescription>Start with the output. You will add ingredient or component lines on the next screen.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadError && <div role="alert" className="mb-4 rounded-lg border border-destructive/40 p-3 text-sm">
              <p>Could not load units, numbering or warehouses. Retry before creating this BOM.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setLoadAttempt(n => n + 1)}>Retry setup data</Button>
            </div>}
            <form onSubmit={handleSubmit} className="space-y-4" aria-busy={saving || hydrating}>
              <div className="grid gap-4 sm:grid-cols-2" data-bom-identity>
                <div className="space-y-2">
                  <Label htmlFor="bom-code">Code preview</Label>
                  <Input
                    id="bom-code"
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
                  <Label htmlFor="bom-name">{terms.nameLabel} <span className="text-muted-foreground">*</span></Label>
                  <Input id="bom-name" autoComplete="off" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder={terms.formulaTitle} required />
                </div>
              </div>
              <div className="space-y-2" data-bom-product role="group" aria-labelledby="bom-product-label">
                <Label id="bom-product-label">Finished product <span className="text-muted-foreground">*</span></Label>
                <AsyncSearchableSelect
                  value={finishedProductId}
                  selectedOption={finishedProductOption}
                  onValueChange={setFinishedProductId}
                  onOptionSelect={setFinishedProductOption}
                  loadOptions={loadFinishedProducts}
                  placeholder="Select product"
                  searchPlaceholder="Name, size, or barcode"
                  emptyMessage="No products match that search."
                  searchDebounceMs={250}
                  showSelectedDescription
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2" data-bom-output>
                <div className="space-y-2">
                  <Label htmlFor="bom-quantity">Batch output <span className="text-muted-foreground">*</span></Label>
                  <Input
                    id="bom-quantity"
                    required
                    type="number"
                    min={0.001}
                    step={0.001}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bom-uom">Output unit</Label>
                  <Select
                    disabled={hydrating || uomCodes.length === 0}
                    value={uom}
                    onValueChange={setUom}
                  >
                    <SelectTrigger id="bom-uom">
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
              <div className="space-y-2" data-bom-type>
                <Label htmlFor="bom-type">Production method</Label>
                <Select value={type} onValueChange={(v) => setType(v as BomType)}>
                  <SelectTrigger id="bom-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">BOM (Standard assembly)</SelectItem>
                    <SelectItem value="formula">Formula (Batch / process)</SelectItem>
                    <SelectItem value="disassembly">Disassembly (Reverse — one input → many outputs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2" data-bom-warehouse>
                <Label htmlFor="bom-warehouse">Output warehouse <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={outputWarehouseId || "__none__"} onValueChange={(value) => setOutputWarehouseId(value === "__none__" ? "" : value)}>
                  <SelectTrigger id="bom-warehouse">
                    <SelectValue placeholder="Where finished goods are received" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Choose later on the work order</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.code ? `${warehouse.code} — ${warehouse.name}` : warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {submitError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{submitError}</p>}
              <div className="flex gap-2 border-t pt-4">
                <Button type="submit" disabled={hydrating || loadError || saving || !uomCodes.includes(uom)}>
                  <Icons.Check className="mr-2 h-4 w-4" />
                  {saving ? `Creating ${terms.formula}…` : `Create ${terms.formula}`}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/manufacturing/boms">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <aside className="self-start rounded-xl border bg-muted/30 p-5 space-y-4" data-bom-review>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Batch preview</p>
          <h2 className="break-words text-lg font-semibold">{name.trim() || `Your new ${terms.formula}`}</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-muted-foreground">Finished product</dt><dd className="break-words font-medium">{finishedProductOption?.label || "Select a product"}</dd></div>
            <div><dt className="text-muted-foreground">Batch output</dt><dd className="font-medium">{quantity || "—"} {uom}</dd></div>
            <div><dt className="text-muted-foreground">Method</dt><dd className="capitalize font-medium">{type}</dd></div>
            <div><dt className="text-muted-foreground">Output destination</dt><dd>{warehouses.find(w => w.id === outputWarehouseId)?.name || "Choose on the work order"}</dd></div>
          </dl>
          <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">Next: add components and quantities, then link a routing. Creating this {terms.formula} does not post inventory.</p>
        </aside>
      </div>
    </PageShell>
  );
}
