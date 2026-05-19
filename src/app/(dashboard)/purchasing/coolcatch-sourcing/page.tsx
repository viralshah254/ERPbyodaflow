"use client";

import { useState } from "react";
import { createSourcingBatch } from "@/lib/api/coolcatch-gap";

/** Mobile-friendly guided sourcing (Models 1–3) for warehouse staff. */
export default function CoolcatchSourcingPage() {
  const [model, setModel] = useState("MODEL_1_GUTTING");
  const [inputKg, setInputKg] = useState("");
  const [sellableKg, setSellableKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [inboundCost, setInboundCost] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const r = await createSourcingBatch({
        sourcingModel: model,
        inputKg: Number(inputKg),
        sellableKg: Number(sellableKg),
        productPricePerKg: Number(pricePerKg),
        costLines: inboundCost
          ? [{ category: "inbound_freight", amountKes: Number(inboundCost), label: "Inbound" }]
          : [],
      });
      setResult(`Batch ${r.batchId} · EMP ${r.empPerKg} KES/kg`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">CoolCatch sourcing</h1>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      >
        <option value="MODEL_1_GUTTING">Model 1 — Gutting</option>
        <option value="MODEL_2_PRE_GUTTED">Model 2 — Pre-gutted</option>
        <option value="MODEL_3_FILLETING">Model 3 — Filleting</option>
      </select>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder="Input KG"
        value={inputKg}
        onChange={(e) => setInputKg(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder="Sellable KG"
        value={sellableKg}
        onChange={(e) => setSellableKg(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder="Product price / kg (KES)"
        value={pricePerKg}
        onChange={(e) => setPricePerKg(e.target.value)}
      />
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder="Inbound cost (KES)"
        value={inboundCost}
        onChange={(e) => setInboundCost(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm text-green-700">{result}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Create batch & recalc EMP"}
      </button>
    </div>
  );
}
