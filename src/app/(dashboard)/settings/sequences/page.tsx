"use client";

import * as React from "react";
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
import { listSequences, createSequence, updateSequence } from "@/lib/data/sequences.repo";
import type { SequenceRow } from "@/lib/mock/sequences";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const DOC_TYPES = ["Sales Order", "Invoice", "Purchase Order", "Bill", "Journal Entry", "Quote", "Delivery Note", "Goods Receipt"];

export default function NumberingSequencesPage() {
  const [rows, setRows] = React.useState<SequenceRow[]>(() => listSequences());
  const refresh = React.useCallback(() => setRows(listSequences()), []);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SequenceRow | null>(null);
  const [form, setForm] = React.useState({
    documentType: "Sales Order",
    prefix: "",
    nextNumber: 1,
    suffix: "",
    padding: 4,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      documentType: "Sales Order",
      prefix: "SO-",
      nextNumber: 1001,
      suffix: "",
      padding: 4,
    });
    setDrawerOpen(true);
  };

  const openEdit = (r: SequenceRow) => {
    setEditing(r);
    setForm({
      documentType: r.documentType,
      prefix: r.prefix,
      nextNumber: r.nextNumber,
      suffix: r.suffix,
      padding: r.padding,
    });
    setDrawerOpen(true);
  };

  const formatExample = () => {
    const n = String(form.nextNumber).padStart(form.padding, "0");
    return `${form.prefix}${n}${form.suffix}`;
  };

  return (
    <PageShell>
      <PageHeader
        title="Numbering Sequences"
        description="Document number prefixes, next value, padding"
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Numbering Sequences" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={openCreate}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Sequence
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sequences</CardTitle>
            <CardDescription>
              {rows.length} sequence(s). Example: SO-0001, INV-0502.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document type</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Next number</TableHead>
                  <TableHead>Suffix</TableHead>
                  <TableHead>Padding</TableHead>
                  <TableHead>Example</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const ex = `${r.prefix}${String(r.nextNumber).padStart(r.padding, "0")}${r.suffix}`;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.documentType}</TableCell>
                      <TableCell>{r.prefix}</TableCell>
                      <TableCell>{r.nextNumber}</TableCell>
                      <TableCell>{r.suffix || "—"}</TableCell>
                      <TableCell>{r.padding}</TableCell>
                      <TableCell className="font-mono text-sm">{ex}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit sequence" : "Add sequence"}</SheetTitle>
            <SheetDescription>
              Saved to browser storage. API pending.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Document type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.documentType}
                onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input
                value={form.prefix}
                onChange={(e) => setForm((p) => ({ ...p, prefix: e.target.value }))}
                placeholder="e.g. SO-"
              />
            </div>
            <div className="space-y-2">
              <Label>Next number</Label>
              <Input
                type="number"
                value={form.nextNumber}
                onChange={(e) => setForm((p) => ({ ...p, nextNumber: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Suffix (optional)</Label>
              <Input
                value={form.suffix}
                onChange={(e) => setForm((p) => ({ ...p, suffix: e.target.value }))}
                placeholder="e.g. -FY25"
              />
            </div>
            <div className="space-y-2">
              <Label>Padding</Label>
              <Input
                type="number"
                value={form.padding}
                onChange={(e) => setForm((p) => ({ ...p, padding: parseInt(e.target.value, 10) || 4 }))}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Example: <span className="font-mono">{formatExample()}</span>
            </p>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editing) {
                  updateSequence(editing.id, {
                    documentType: form.documentType,
                    prefix: form.prefix,
                    nextNumber: form.nextNumber,
                    suffix: form.suffix,
                    padding: form.padding,
                  });
                  toast.success("Sequence updated.");
                } else {
                  createSequence({
                    documentType: form.documentType,
                    prefix: form.prefix,
                    nextNumber: form.nextNumber,
                    suffix: form.suffix,
                    padding: form.padding,
                  });
                  toast.success("Sequence created.");
                }
                setDrawerOpen(false);
                refresh();
              }}
            >
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
