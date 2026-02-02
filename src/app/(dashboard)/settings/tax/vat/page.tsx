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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listVatRates, saveVatRates } from "@/lib/data/tax.repo";
import type { KenyaVatRate } from "@/lib/mock/tax/kenya";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

const KINDS = ["standard", "zero", "exempt"] as const;

export default function VatSettingsPage() {
  const [rates, setRates] = React.useState<KenyaVatRate[]>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KenyaVatRate | null>(null);
  const [form, setForm] = React.useState<{ code: string; name: string; rate: number; kind: "standard" | "zero" | "exempt" }>({
    code: "",
    name: "",
    rate: 0,
    kind: "standard",
  });

  React.useEffect(() => {
    setRates(listVatRates());
  }, []);

  const openEdit = (r: KenyaVatRate) => {
    setEditing(r);
    setForm({ code: r.code, name: r.name, rate: r.rate, kind: r.kind });
    setEditOpen(true);
  };

  const handleSave = () => {
    const next = rates.map((r) =>
      r.id === editing?.id
        ? { ...r, code: form.code, name: form.name, rate: form.rate, kind: form.kind }
        : r
    );
    saveVatRates(next);
    setRates(next);
    setEditOpen(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="VAT (Kenya)"
        description="Standard 16%, Zero-rated, Exempt. Seed list; allow edit."
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
            <CardDescription>Default seed: Standard 16%, Zero 0%, Exempt. Edit as needed.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(r)}>
                    <TableCell className="font-medium">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.rate}</TableCell>
                    <TableCell>{r.kind}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit VAT rate</SheetTitle>
            <SheetDescription>Code, name, rate, kind.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rate %</Label>
              <Input type="number" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((p) => ({ ...p, kind: v as "standard" | "zero" | "exempt" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
