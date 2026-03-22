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
import { fetchProductApi } from "@/lib/api/products";
import {
  createProductVariantApi,
  deleteProductVariantApi,
  fetchProductAttributeDefsApi,
  fetchProductVariantsApi,
  updateProductVariantApi,
} from "@/lib/api/product-master";
import type { ProductVariant, VariantAttribute } from "@/lib/products/types";
import { canDeleteEntity } from "@/lib/permissions";
import { t } from "@/lib/terminology";
import { useAuthStore } from "@/stores/auth-store";
import { useTerminology } from "@/stores/orgContextStore";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { toast } from "sonner";
import * as Icons from "lucide-react";

/** @deprecated Variants are now managed on the main product page (/master/products/[id]?tab=variants). This page is kept for backward compatibility. */
export default function ProductVariantsPage() {
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const canDelete = canDeleteEntity(user);
  const terminology = useTerminology();
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const [product, setProduct] = React.useState<Awaited<ReturnType<typeof fetchProductApi>> | null | undefined>(undefined);
  const [variants, setVariants] = React.useState<ProductVariant[]>([]);
  const [attributeDefs, setAttributeDefs] = React.useState<{ id: string; name: string; kind: string; options: string[] }[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductVariant | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchProductApi(id)
      .then((value) => {
        if (!cancelled) setProduct(value);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error((error as Error).message);
          setProduct(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    if (!product) return;
    let cancelled = false;
    Promise.all([fetchProductVariantsApi(product.id), fetchProductAttributeDefsApi()])
      .then(([variantRows, attributeRows]) => {
        if (cancelled) return;
        setVariants(variantRows);
        setAttributeDefs(attributeRows);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [product]);

  const handleSave = async (v: Omit<ProductVariant, "id" | "productId">) => {
    if (!product) return;
    try {
      if (editing) await updateProductVariantApi(product.id, editing.id, v);
      else await createProductVariantApi(product.id, v);
      setVariants(await fetchProductVariantsApi(product.id));
      setSheetOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRemove = async (variantId: string) => {
    if (!product) return;
    try {
      await deleteProductVariantApi(product.id, variantId);
      setVariants(await fetchProductVariantsApi(product.id));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (product === undefined) {
    return (
      <PageShell>
        <PageHeader title="Loading product" breadcrumbs={[{ label: "Masters", href: "/master" }, { label: "Products", href: "/master/products" }, { label: "Loading..." }]} />
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <PageHeader title="Product not found" breadcrumbs={[{ label: "Masters", href: "/master" }, { label: "Products", href: "/master/products" }, { label: "Not found" }]} />
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
      <div className="px-6 pt-4">
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
          <Icons.ArrowLeftRight className="h-4 w-4 shrink-0" />
          Variants are now managed on the main product page.
          <Link href={`/master/products/${id}`} className="ml-auto text-foreground underline underline-offset-4 hover:no-underline whitespace-nowrap">
            Open product page →
          </Link>
        </div>
      </div>
      <PageHeader
        title={`Variants — ${product.sku}`}
        description="Size, packaging, grade. SKU per variant."
        breadcrumbs={[
          { label: "Masters", href: "/master" },
          { label: t("product", terminology) + "s", href: "/master/products" },
          { label: product.name || product.sku, href: `/master/products/${id}` },
          { label: "Variants" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain product variants (size, packaging, grade) and SKU per variant." label="Explain" />
            {copilotEnabled ? (
              <Button size="sm" onClick={() => openWithPrompt(`Suggest variants for ${product.sku} (${product.name}).`)}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Copilot
              </Button>
            ) : null}
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
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(v.id)}>Remove</Button>
                        )}
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
