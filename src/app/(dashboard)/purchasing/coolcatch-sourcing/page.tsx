"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSourcingBatch } from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";
import { useCanWritePurchasing } from "@/lib/rbac/use-write-guard";

const TILAPIA_YIELDS: Record<string, number> = {
  "Tilapia Fillet": 32.1,
  "Mgongo Wazi (Frame)": 58,
  Skin: 5,
  Chips: 3,
  Fins: 2,
};

const NILE_PERCH_YIELDS: Record<string, number> = {
  "Nile Perch Fillet": 43,
  "NP Frame": 30,
  Skin: 7.6,
  Chips: 4.1,
  Fins: 2.7,
  Maw: 2,
  Fat: 2.7,
};

function costLine(cat: string, amount: string, label: string) {
  const v = Number(amount);
  if (!amount.trim() || Number.isNaN(v) || v <= 0) return null;
  return { category: cat, amountKes: v, label };
}

type SkuRow = { key: string; label: string; yieldPct: string; kg: string };

/** Guided sourcing (Models 1–3) with multi-SKU filleting apportionment. */
export default function CoolcatchSourcingPage() {
  const canWrite = useCanWritePurchasing();
  const [model, setModel] = useState("MODEL_1_GUTTING");
  const [species, setSpecies] = useState<"tilapia" | "nile_perch">("tilapia");
  const [supplier, setSupplier] = useState("");
  const [farm, setFarm] = useState("");
  const [inputKg, setInputKg] = useState("");
  const [sellableKg, setSellableKg] = useState("");
  const [yieldPct, setYieldPct] = useState("90");
  const [pricePerKg, setPricePerKg] = useState("");
  const [inboundCost, setInboundCost] = useState("");
  const [guttingCost, setGuttingCost] = useState("");
  const [iceCost, setIceCost] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [bmuCost, setBmuCost] = useState("");
  const [cessCost, setCessCost] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [skuRows, setSkuRows] = useState<SkuRow[]>([]);
  const [saving, setSaving] = useState(false);

  const yieldTable = species === "tilapia" ? TILAPIA_YIELDS : NILE_PERCH_YIELDS;

  const initModel3Skus = () => {
    setSkuRows(
      Object.entries(yieldTable).map(([label, y]) => ({
        key: label,
        label,
        yieldPct: String(y),
        kg: "",
      }))
    );
  };

  const recalcSellableFromYield = () => {
    const input = Number(inputKg);
    const y = Number(yieldPct);
    if (input > 0 && y > 0) setSellableKg(String(Math.round(input * (y / 100) * 10) / 10));
  };

  const recalcModel3 = () => {
    const input = Number(inputKg);
    if (input <= 0) return;
    let total = 0;
    const next = skuRows.map((row) => {
      const y = Number(row.yieldPct);
      const kg = input > 0 && y > 0 ? Math.round(input * (y / 100) * 10) / 10 : 0;
      total += kg;
      return { ...row, kg: kg > 0 ? String(kg) : "" };
    });
    setSkuRows(next);
    setSellableKg(String(Math.round(total * 10) / 10));
  };

  const skuLinesPayload = useMemo(() => {
    if (model !== "MODEL_3_FILLETING") return undefined;
    return skuRows
      .map((row, i) => {
        const kg = Number(row.kg);
        if (kg <= 0) return null;
        return {
          productId: `sku-${i + 1}`,
          sku: row.label.trim() || `SKU-${i + 1}`,
          sellableKg: kg,
        };
      })
      .filter(Boolean) as Array<{ productId: string; sku: string; sellableKg: number }>;
  }, [model, skuRows]);

  const submit = async () => {
    setSaving(true);
    try {
      const costLines = [
        costLine("inbound_freight", inboundCost, "Inbound"),
        costLine("gutting", guttingCost, "Gutting"),
        costLine("ice", iceCost, "Ice"),
        costLine("fuel", fuelCost, "Fuel"),
        costLine("bmu", bmuCost, "BMU"),
        costLine("cess", cessCost, "Cess"),
        costLine("packaging", packagingCost, "Packaging"),
      ].filter(Boolean) as Array<{ category: string; amountKes: number; label: string }>;

      const body: Record<string, unknown> = {
        sourcingModel: model,
        supplierName: supplier.trim() || undefined,
        farmLocation: farm.trim() || undefined,
        sourcingDate: new Date().toISOString().slice(0, 10),
        inputKg: Number(inputKg),
        sellableKg: Number(sellableKg),
        productPricePerKg: Number(pricePerKg),
        costLines,
      };
      if (model !== "MODEL_3_FILLETING") {
        body.yieldPct = Number(yieldPct);
      }
      if (skuLinesPayload?.length) body.skuLines = skuLinesPayload;

      const r = await createSourcingBatch(body);
      toast.success(`Batch ${r.batchId} · EMP ${r.empPerKg} KES/kg`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="CoolCatch new batch"
        description="Record sourcing Models 1–3; EMP/kg recalculates on save."
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "New batch" },
        ]}
        sticky
        actions={
          <Button asChild variant="outline">
            <Link href="/purchasing/coolcatch-sourcing-batches">View batches</Link>
          </Button>
        }
      />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Sourcing entry</CardTitle>
            <CardDescription>
              Model 3 apportions shared costs by KG contribution across SKU lines (workbook T2).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sourcing model</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                value={model}
                onChange={(e) => {
                  const v = e.target.value;
                  setModel(v);
                  if (v === "MODEL_3_FILLETING" && skuRows.length === 0) initModel3Skus();
                  if (v === "MODEL_2_PRE_GUTTED") {
                    const input = Number(inputKg);
                    if (input > 0) setSellableKg(String(input));
                  }
                }}
              >
                <option value="MODEL_1_GUTTING">Model 1 — Gutting</option>
                <option value="MODEL_2_PRE_GUTTED">Model 2 — Pre-gutted</option>
                <option value="MODEL_3_FILLETING">Model 3 — Filleting</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Farm / landing</Label>
                <Input value={farm} onChange={(e) => setFarm(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Input KG</Label>
                <Input
                  type="number"
                  value={inputKg}
                  onChange={(e) => {
                    setInputKg(e.target.value);
                    if (model === "MODEL_2_PRE_GUTTED") setSellableKg(e.target.value);
                    if (model === "MODEL_3_FILLETING") setTimeout(recalcModel3, 0);
                    else recalcSellableFromYield();
                  }}
                />
              </div>
              {model !== "MODEL_3_FILLETING" ? (
                <>
                  <div className="space-y-2">
                    <Label>Yield %</Label>
                    <Input
                      type="number"
                      value={yieldPct}
                      onChange={(e) => {
                        setYieldPct(e.target.value);
                        recalcSellableFromYield();
                      }}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Sellable KG</Label>
                    <Input type="number" value={sellableKg} onChange={(e) => setSellableKg(e.target.value)} />
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label>Product price / kg (KES)</Label>
                <Input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Cost lines (KES)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Inbound freight" type="number" value={inboundCost} onChange={(e) => setInboundCost(e.target.value)} />
              {model === "MODEL_1_GUTTING" ? (
                <Input placeholder="Gutting" type="number" value={guttingCost} onChange={(e) => setGuttingCost(e.target.value)} />
              ) : null}
              <Input placeholder="Ice" type="number" value={iceCost} onChange={(e) => setIceCost(e.target.value)} />
              <Input placeholder="Fuel" type="number" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} />
              <Input placeholder="BMU" type="number" value={bmuCost} onChange={(e) => setBmuCost(e.target.value)} />
              <Input placeholder="Cess" type="number" value={cessCost} onChange={(e) => setCessCost(e.target.value)} />
              {model === "MODEL_3_FILLETING" ? (
                <Input placeholder="Packaging" type="number" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} />
              ) : null}
            </div>

            {model === "MODEL_3_FILLETING" ? (
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base">SKU outputs</Label>
                  <select
                    className="border rounded px-2 py-1 text-sm bg-background"
                    value={species}
                    onChange={(e) => {
                      setSpecies(e.target.value as "tilapia" | "nile_perch");
                      setSkuRows([]);
                    }}
                  >
                    <option value="tilapia">Tilapia yields</option>
                    <option value="nile_perch">Nile Perch yields</option>
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={initModel3Skus}>
                    Load benchmark yields
                  </Button>
                </div>
                {skuRows.map((row, i) => (
                  <div key={row.key} className="grid grid-cols-3 gap-2 text-sm">
                    <Input
                      value={row.label}
                      onChange={(e) => {
                        const next = [...skuRows];
                        next[i] = { ...row, label: e.target.value };
                        setSkuRows(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Yield %"
                      value={row.yieldPct}
                      onChange={(e) => {
                        const next = [...skuRows];
                        next[i] = { ...row, yieldPct: e.target.value };
                        setSkuRows(next);
                        setTimeout(recalcModel3, 0);
                      }}
                    />
                    <Input type="number" placeholder="KG" value={row.kg} readOnly className="bg-muted" />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>Total sellable KG</Label>
                  <Input type="number" value={sellableKg} readOnly className="bg-muted" />
                </div>
              </div>
            ) : null}

            <Button type="button" disabled={saving || !canWrite} className="w-full" onClick={() => void submit()}>
              {saving ? "Saving…" : "Create batch & recalc EMP"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
