"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProductById, listPackaging, listProductPrices, saveProductPrices } from "@/lib/data/products.repo";
import { listPriceLists } from "@/lib/data/pricing.repo";
import { listUoms } from "@/lib/data/uom.repo";
import type { PricingTier, ProductPrice } from "@/lib/products/pricing-types";
import { validateTiers } from "@/lib/pricing/validation";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import * as Icons from "lucide-react";

function effectivePerBase(t: PricingTier, packaging: { uom: string; unitsPer: number; baseUom: string }[]): number | null {
  const p = packaging.find((x) => x.uom === t.uom);
  if (!p || p.unitsPer <= 0) return null;
  return t.price / p.unitsPer;
}

export default function ProductPricingPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const product = React.useMemo(() => getProductById(id), [id]);
  const packaging = React.useMemo(() => (product ? listPackaging(product.id) : []), [product]);
  const priceLists = React.useMemo(() => listPriceLists(), []);

  const [selectedListId, setSelectedListId] = React.useState<string>(priceLists[0]?.id ?? "");
  const prices = React.useMemo(() => (product ? listProductPrices(product.id, selectedListId) : []), [product, selectedListId]);
  const tiers = React.useMemo(() => prices[0]?.tiers ?? [], [prices]);
  const [draftTiers, setDraftTiers] = React.useState<PricingTier[]>([]);
  const [compareView, setCompareView] = React.useState(false);
  const [tierSheetOpen, setTierSheetOpen] = React.useState(false);
  const [editingTierIndex, setEditingTierIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setDraftTiers(tiers);
  }, [tiers, selectedListId]);

  const pl = priceLists.find((l) => l.id === selectedListId);
  const currency = pl?.currency ?? "KES";
  const baseUom = product?.baseUom ?? product?.unit ?? "EA";
  const tierValidation = React.useMemo(
    () => validateTiers(draftTiers, packaging, { unitCost: undefined }),
    [draftTiers, packaging]
  );
  const warnings = [...tierValidation.errors, ...tierValidation.warnings];

  const handleSaveTiers = () => {
    if (!product) return;
    const pp: ProductPrice = {
      productId: product.id,
      priceListId: selectedListId,
      tiers: draftTiers,
      startDate: prices[0]?.startDate,
      endDate: prices[0]?.endDate,
      notes: prices[0]?.notes,
    };
    saveProductPrices([pp]);
    setTierSheetOpen(false);
    setEditingTierIndex(null);
  };

  const handleApplyTemplate = () => {
    toast.info("Apply pricing template (stub). API pending.");
  };

  if (!product) {
    return (
      <PageShell>
        <PageHeader title="Product not found" breadcrumbs={[{ label: "Masters", href: "/master" }, { label: "Products", href: "/master/products" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/master/products">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const editingTier = editingTierIndex != null ? draftTiers[editingTierIndex] ?? null : null;

  return (
    <PageShell>
      <PageHeader
        title={`Pricing — ${product.sku}`}
        description="Tiered pricing, validity, compare price lists."
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.sku, href: `/master/products/${id}` },
          { label: "Pricing" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain tiered pricing and effective unit price." label="Explain" />
            <Button size="sm" onClick={() => openWithPrompt(`Suggest pricing tiers for ${product.sku}. Detect margin issues by price list.`)}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Copilot
            </Button>
            <Button variant="outline" size="sm" onClick={handleApplyTemplate}>
              Apply template
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/simulations">Simulate pricing</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCompareView(!compareView)}>
              {compareView ? "Tiers" : "Compare lists"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}`}>Product</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/master/products">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-2">
            <Label>Price list</Label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priceLists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} ({l.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {warnings.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base">Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm list-disc list-inside space-y-1">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {compareView ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compare price lists</CardTitle>
              <CardDescription>Effective per {baseUom} by list (stub matrix).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Min price / {baseUom}</TableHead>
                    <TableHead>Tiers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLists.map((l) => {
                    const pp = listProductPrices(product.id, l.id)[0];
                    const trs = pp?.tiers ?? [];
                    const minEff = trs.length
                      ? Math.min(
                          ...trs.map((t) => effectivePerBase(t, packaging)).filter((n): n is number => n != null)
                        )
                      : null;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell>{l.currency}</TableCell>
                        <TableCell>{minEff != null ? formatMoney(minEff, l.currency) : "—"}</TableCell>
                        <TableCell>{trs.length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiers — {pl?.name ?? selectedListId}</CardTitle>
              <CardDescription>Min/max qty, UOM, price. Effective per base unit.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {draftTiers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No tiers. Add below or apply template.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min qty</TableHead>
                      <TableHead>Max qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Effective / {baseUom}</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftTiers.map((t, i) => {
                      const eff = effectivePerBase(t, packaging);
                      return (
                        <TableRow key={i}>
                          <TableCell>{t.minQty}</TableCell>
                          <TableCell>{t.maxQty ?? "∞"}</TableCell>
                          <TableCell>{t.uom}</TableCell>
                          <TableCell>{formatMoney(t.price, currency)}</TableCell>
                          <TableCell className="text-muted-foreground">{eff != null ? formatMoney(eff, currency) : "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingTierIndex(i); setTierSheetOpen(true); }}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => setDraftTiers((prev) => prev.filter((_, j) => j !== i))}>Remove</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="p-4 border-t">
                <Button size="sm" onClick={() => { setEditingTierIndex(null); setTierSheetOpen(true); }}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add tier
                </Button>
                <Button size="sm" className="ml-2" onClick={handleSaveTiers}>
                  Save tiers
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TierSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        packaging={packaging}
        currency={currency}
        baseUom={baseUom}
        initial={editingTier}
        onAdd={(t) => { setDraftTiers((prev) => [...prev, t]); setTierSheetOpen(false); setEditingTierIndex(null); }}
        onUpdate={(t) => {
          if (editingTierIndex == null) return;
          setDraftTiers((prev) => {
            const n = [...prev];
            n[editingTierIndex] = t;
            return n;
          });
          setTierSheetOpen(false);
          setEditingTierIndex(null);
        }}
        onCancel={() => { setTierSheetOpen(false); setEditingTierIndex(null); }}
        isEdit={editingTierIndex != null}
        uomOptions={React.useMemo(() => listUoms().map((u) => u.code), [])}
      />
    </PageShell>
  );
}

function TierSheet({
  open,
  onOpenChange,
  packaging,
  currency,
  baseUom,
  uomOptions,
  initial,
  onAdd,
  onUpdate,
  onCancel,
  isEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packaging: { uom: string; unitsPer: number; baseUom: string }[];
  currency: string;
  baseUom: string;
  uomOptions: string[];
  initial: PricingTier | null;
  onAdd: (t: PricingTier) => void;
  onUpdate: (t: PricingTier) => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const [minQty, setMinQty] = React.useState(initial?.minQty ?? 1);
  const [maxQty, setMaxQty] = React.useState(initial?.maxQty ?? "");
  const [uom, setUom] = React.useState(initial?.uom ?? "EA");
  const [price, setPrice] = React.useState(initial?.price ?? 0);

  React.useEffect(() => {
    if (!open) return;
    setMinQty(initial?.minQty ?? 1);
    setMaxQty(initial?.maxQty !== undefined && initial.maxQty != null ? String(initial.maxQty) : "");
    setUom(initial?.uom ?? "EA");
    setPrice(initial?.price ?? 0);
  }, [open, initial]);

  const p = packaging.find((x) => x.uom === uom);
  const eff = p && p.unitsPer > 0 ? price / p.unitsPer : null;

  const handleSubmit = () => {
    const t: PricingTier = {
      minQty,
      maxQty: maxQty === "" ? undefined : Number(maxQty),
      uom,
      price,
    };
    if (isEdit) onUpdate(t);
    else onAdd(t);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit tier" : "Add tier"}</SheetTitle>
          <SheetDescription>Min/max qty, UOM, price. Effective per {baseUom}.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Min qty</Label>
            <Input type="number" min={0} value={minQty} onChange={(e) => setMinQty(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Max qty (optional)</Label>
            <Input type="number" min={0} placeholder="∞" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>UOM</Label>
            <Select value={uom} onValueChange={setUom}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uomOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Price ({currency})</Label>
            <Input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(Number((e.target as HTMLInputElement).value) || 0)} />
          </div>
          {eff != null && (
            <p className="text-sm text-muted-foreground">
              Effective per {baseUom}: {formatMoney(eff, currency)}
            </p>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Update" : "Add"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
