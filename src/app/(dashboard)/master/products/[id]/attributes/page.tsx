"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProductById, listAttributeDefs, saveAttributeDefs, listVariants } from "@/lib/data/products.repo";
import type { ProductAttributeDef } from "@/lib/products/types";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

const KINDS: ProductAttributeDef["kind"][] = ["size", "grade", "flavor", "packagingType", "spec", "custom"];

export default function ProductAttributesPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();

  const product = React.useMemo(() => getProductById(id), [id]);
  const [defs, setDefs] = React.useState<ProductAttributeDef[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductAttributeDef | null>(null);

  React.useEffect(() => {
    setDefs(listAttributeDefs());
  }, []);

  const variants = React.useMemo(() => (product ? listVariants(product.id) : []), [product]);

  const handleSave = (d: Omit<ProductAttributeDef, "id">) => {
    if (editing) {
      const next = defs.map((x) => (x.id === editing.id ? { ...x, ...d, id: x.id } : x));
      saveAttributeDefs(next);
      setDefs(next);
    } else {
      const created: ProductAttributeDef = { ...d, id: `ad${Date.now()}` };
      saveAttributeDefs([...defs, created]);
      setDefs([...defs, created]);
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleRemove = (defId: string) => {
    const next = defs.filter((x) => x.id !== defId);
    saveAttributeDefs(next);
    setDefs(next);
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

  return (
    <PageShell>
      <PageHeader
        title={`Attributes — ${product.sku}`}
        description="Size, grade, flavor, packaging type. Used by variants."
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.sku, href: `/master/products/${id}` },
          { label: "Attributes" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain product attributes (size, grade, flavor) and how they are used in variants." label="Explain" />
            <Button size="sm" onClick={() => { setEditing(null); setSheetOpen(true); }}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add attribute
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}`}>Product</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}/variants`}>Variants</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/master/products">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attribute definitions</CardTitle>
            <CardDescription>Org-level. Options (e.g. 1kg, 5kg) used when creating variants.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No attribute definitions. Add size, grade, flavor, etc.
                    </TableCell>
                  </TableRow>
                ) : (
                  defs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.options.join(", ")}
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(d); setSheetOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(d.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variants using attributes</CardTitle>
            <CardDescription>Product {product.sku} has {variants.length} variant(s).</CardDescription>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No variants yet. Add them from the Variants tab.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {variants.map((v) => (
                  <li key={v.id}>
                    <span className="font-mono">{v.sku}</span>
                    {v.attributes.length > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ({v.attributes.map((a) => `${a.key}: ${a.value}`).join(", ")})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href={`/master/products/${id}/variants`}>Manage variants</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {sheetOpen && (
        <AttributeSheet
          initial={editing}
          onSave={handleSave}
          onClose={() => { setSheetOpen(false); setEditing(null); }}
        />
      )}
    </PageShell>
  );
}

function AttributeSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: ProductAttributeDef | null;
  onSave: (d: Omit<ProductAttributeDef, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [kind, setKind] = React.useState<ProductAttributeDef["kind"]>(initial?.kind ?? "custom");
  const [optionsText, setOptionsText] = React.useState(initial?.options?.join(", ") ?? "");

  const handleSave = () => {
    const options = optionsText.split(",").map((s) => s.trim()).filter(Boolean);
    onSave({ name: name.trim(), kind, options });
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit attribute" : "Add attribute"}</SheetTitle>
          <SheetDescription>Name, kind, and options (comma-separated).</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Size" />
          </div>
          <div>
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ProductAttributeDef["kind"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Options (comma-separated)</Label>
            <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="1kg, 5kg, 25kg" />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
