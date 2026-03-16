"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createVatRate,
  listVatRates,
} from "@/lib/data/tax.repo";
import type { KenyaVatRate } from "@/lib/types/tax-kenya";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function VatSettingsPage() {
  const [rates, setRates] = React.useState<KenyaVatRate[]>([]);
  const [form, setForm] = React.useState<{ code: string; name: string; rate: number }>({
    code: "",
    name: "",
    rate: 0,
  });

  const reload = React.useCallback(async () => {
    const items = await listVatRates();
    setRates(items);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load VAT rates.");
    });
  }, [reload]);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required.");
      return;
    }
    try {
      await createVatRate({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        rate: form.rate,
      });
      setForm({ code: "", name: "", rate: 0 });
      await reload();
      toast.success("VAT rate created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create VAT rate.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="VAT (Kenya)"
        description="VAT rates backed by live settings."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Tax", href: "/settings/tax/kenya" },
          { label: "VAT" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain VAT rates and exempt vs zero-rated in Kenya." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/tax/kenya">Kenya profile</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>VAT rates</CardTitle>
            <CardDescription>Maintain VAT codes and rates used on documents.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>Kind</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.rate}</TableCell>
                    <TableCell>{r.kind}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Add VAT rate</CardTitle>
            <CardDescription>Create a new VAT code and rate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. VAT16" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard VAT" />
            </div>
            <div className="space-y-2">
              <Label>Rate %</Label>
              <Input type="number" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
            </div>
            <Button onClick={handleCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Create VAT code
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
