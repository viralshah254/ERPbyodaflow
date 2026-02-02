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
import { getProductById, listVariants, saveVariants, createVariant, updateVariant, deleteVariant, listAttributeDefs } from "@/lib/data/products.repo";
import type { ProductVariant, VariantAttribute } from "@/lib/products/types";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import * as Icons from "lucide-react";

export default function ProductVariantsPage() {
  const params = useParams();
  const id = params.id as string;
  const terminology = useTerminology();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const product = React.useMemo(() => getProductById(id), [id]);
  const [variants, setVariants] = React.useState<ProductVariant[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductVariant | null>(null);

  React.useEffect(() => {
    if (product) setVariants(listVariants(product.id));
  }, [product]);

  const attributeDefs = React.useMemo(() => listAttributeDefs(), []);

  const handleSave = (v: Omit<ProductVariant, "id" | "productId">) => {
    if (!product) return;
    if (editing) {
      updateVariant(product.id, editing.id, v);
    } else {
      createVariant(product.id, v);
    }
    setVariants(listVariants(product.id));
    setSheetOpen(false);
    setEditing(null);
  };

  const handleRemove = (variantId: string) => {
    if (!product) return;
    deleteVariant(product.id, variantId);
    setVariants(listVariants(product.id));
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
        title={`Variants — ${product.sku}`}
        description="Size, packaging, grade. SKU per variant."
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.sku, href: `/master/products/${id}` },
          { label: "Variants" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain product variants (size, packaging, grade) and SKU per variant." label="Explain" />
            <Button size="sm" onClick={() => openWithPrompt(`Suggest variants for ${product.sku} (${product.name}).`)}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Copilot
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setSheetOpen(true); }}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add variant
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}`}>Product</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/master/products/${id}/attributes`}>Attributes</Link>
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
            <CardTitle className="text-base">Variants</CardTitle>
            <CardDescription>Each variant has a unique SKU. Attributes: size, packaging type, grade.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Packaging</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No variants. Add one to define size/packaging/grade and SKU.
                    </TableCell>
                  </TableRow>
                ) : (
                  variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-medium">{v.sku}</TableCell>
                      <TableCell>{v.name ?? "—"}</TableCell>
                      <TableCell>{v.size ?? "—"}</TableCell>
                      <TableCell>{v.packagingType ?? "—"}</TableCell>
                      <TableCell>{v.grade ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={v.status === "ACTIVE" ? "secondary" : "outline"}>{v.status}</Badge>
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(v); setSheetOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(v.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {sheetOpen && (
        <VariantSheet
          initial={editing}
          attributeDefs={attributeDefs}
          onSave={handleSave}
          onClose={() => { setSheetOpen(false); setEditing(null); }}
        />
      )}
    </PageShell>
  );
}

function VariantSheet({
  initial,
  attributeDefs,
  onSave,
  onClose,
}: {
  initial: ProductVariant | null;
  attributeDefs: { id: string; name: string; kind: string; options: string[] }[];
  onSave: (v: Omit<ProductVariant, "id" | "productId">) => void;
  onClose: () => void;
}) {
  const [sku, setSku] = React.useState(initial?.sku ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [size, setSize] = React.useState(initial?.size ?? "");
  const [packagingType, setPackagingType] = React.useState(initial?.packagingType ?? "");
  const [grade, setGrade] = React.useState(initial?.grade ?? "");
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE">(initial?.status ?? "ACTIVE");

  const handleSave = () => {
    const attrs: VariantAttribute[] = [];
    if (size) attrs.push({ key: "size", value: size });
    if (packagingType) attrs.push({ key: "packagingType", value: packagingType });
    if (grade) attrs.push({ key: "grade", value: grade });
    onSave({
      sku: sku.trim(),
      name: name.trim() || undefined,
      attributes: attrs,
      size: size || undefined,
      packagingType: packagingType || undefined,
      grade: grade || undefined,
      status,
    });
  };

  const sizeOpts = attributeDefs.find((a) => a.kind === "size")?.options ?? [];
  const packagingOpts = attributeDefs.find((a) => a.kind === "packagingType")?.options ?? [];
  const gradeOpts = attributeDefs.find((a) => a.kind === "grade")?.options ?? [];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit variant" : "Add variant"}</SheetTitle>
          <SheetDescription>SKU, size, packaging type, grade. Attributes from definitions.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-001-1KG" disabled={!!initial} />
          </div>
          <div>
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Alpha 1kg" />
          </div>
          <div>
            <Label>Size</Label>
            <Select value={size || "_"} onValueChange={(v) => setSize(v === "_" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {sizeOpts.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Packaging type</Label>
            <Select value={packagingType || "_"} onValueChange={(v) => setPackagingType(v === "_" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {packagingOpts.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grade</Label>
            <Select value={grade || "_"} onValueChange={(v) => setGrade(v === "_" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {gradeOpts.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
