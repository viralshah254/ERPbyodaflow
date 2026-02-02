"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { listWhtCodes, saveWhtCodes } from "@/lib/data/tax.repo";
import type { KenyaWhtCode } from "@/lib/mock/tax/kenya";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

export default function WithholdingTaxPage() {
  const [codes, setCodes] = React.useState<KenyaWhtCode[]>([]);
  const [applyOnAp, setApplyOnAp] = React.useState(true);
  const [applyOnPayments, setApplyOnPayments] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KenyaWhtCode | null>(null);
  const [form, setForm] = React.useState({ code: "", name: "", rate: 0 });

  React.useEffect(() => {
    setCodes(listWhtCodes());
  }, []);

  const openEdit = (r: KenyaWhtCode) => {
    setEditing(r);
    setForm({ code: r.code, name: r.name, rate: r.rate });
    setEditOpen(true);
  };

  const handleSave = () => {
    const next = codes.map((r) =>
      r.id === editing?.id ? { ...r, code: form.code, name: form.name, rate: form.rate } : r
    );
    saveWhtCodes(next);
    setCodes(next);
    setEditOpen(false);
  };

  const handleWhtCertificate = () => {
    window.alert("WHT certificate (stub). API pending.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Withholding tax"
        description="WHT codes. Apply on supplier bills (AP), payments (Treasury)."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Tax", href: "/settings/tax/kenya" },
          { label: "Withholding" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain WHT in Kenya. When to apply on AP and payments." label="Explain" />
            <Button variant="outline" size="sm" onClick={handleWhtCertificate}>
              WHT certificate
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/tax/kenya">Kenya profile</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apply WHT on</CardTitle>
            <CardDescription>Supplier bills (AP), Payments (Treasury).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="wht-ap" checked={applyOnAp} onCheckedChange={(c) => setApplyOnAp(c === true)} />
              <Label htmlFor="wht-ap">Supplier bills (AP)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="wht-pay" checked={applyOnPayments} onCheckedChange={(c) => setApplyOnPayments(c === true)} />
              <Label htmlFor="wht-pay">Payments (Treasury)</Label>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>WHT codes</CardTitle>
            <CardDescription>Seed list; allow edit.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(r)}>
                    <TableCell className="font-medium">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.rate}</TableCell>
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
            <SheetTitle>Edit WHT code</SheetTitle>
            <SheetDescription>Code, name, rate.</SheetDescription>
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
