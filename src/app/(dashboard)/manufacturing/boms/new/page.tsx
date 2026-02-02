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
import { createBom } from "@/lib/data/bom.repo";
import { listProducts } from "@/lib/data/products.repo";
import { listUoms } from "@/lib/data/uom.repo";
import type { BomType } from "@/lib/manufacturing/types";
import * as Icons from "lucide-react";

export default function NewBomPage() {
  const router = useRouter();
  const products = React.useMemo(() => listProducts(), []);
  const uoms = React.useMemo(() => listUoms().map((u) => u.code), []);

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [finishedProductId, setFinishedProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [uom, setUom] = React.useState("EA");
  const [type, setType] = React.useState<BomType>("bom");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !finishedProductId) return;
    const bom = createBom({
      code: code.trim(),
      name: name.trim(),
      finishedProductId,
      quantity: Number(quantity) || 1,
      uom: uom || "EA",
      version: "1",
      isActive: true,
      type,
    });
    router.push(`/manufacturing/boms/${bom.id}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="New BOM"
        description="Create a bill of material or formula"
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
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
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BOM-001" required />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Widget A" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Finished product</Label>
                <Select value={finishedProductId} onValueChange={setFinishedProductId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
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
                  <Select value={uom} onValueChange={setUom}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
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
                    <SelectItem value="bom">BOM</SelectItem>
                    <SelectItem value="formula">Formula</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit">
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
