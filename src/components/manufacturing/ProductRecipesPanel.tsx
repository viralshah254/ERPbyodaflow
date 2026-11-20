"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchManufacturingBomsPage, type ManufacturingBom } from "@/lib/api/manufacturing";
import { productionTerms } from "@/lib/manufacturing/production-language";
import { useOrgContextStore } from "@/stores/orgContextStore";

function lifecycleLabel(recipe: ManufacturingBom): string {
  if (recipe.lifecycle === "EFFECTIVE" || (recipe.isActive && !recipe.lifecycle)) return "In production";
  if (recipe.lifecycle === "DRAFT") return "Draft";
  if (recipe.lifecycle === "RETIRED") return "Retired";
  return recipe.isActive ? "Active" : "Inactive";
}

/** Recipes whose output is this product. Each finished good and semi-finished good keeps its own. */
export function ProductRecipesPanel({
  productId,
  productName,
  canWrite,
}: {
  productId: string;
  productName: string;
  canWrite: boolean;
}) {
  const templateId = useOrgContextStore((state) => state.templateId);
  const terms = productionTerms(templateId);
  const [recipes, setRecipes] = React.useState<ManufacturingBom[] | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let current = true;
    setRecipes(null);
    setError("");
    void fetchManufacturingBomsPage({ productId, limit: 50 })
      .then((page) => {
        if (current) setRecipes(page.items);
      })
      .catch((err: unknown) => {
        if (current) setError(err instanceof Error ? err.message : "Could not load recipes.");
      });
    return () => {
      current = false;
    };
  }, [productId]);

  const createHref = `/manufacturing/boms/new?productId=${encodeURIComponent(productId)}`;

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{terms.formulasTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {productName} keeps its own {terms.formula}. Work backwards uses the released {terms.formula} for this product, then the {terms.formulas} of anything it makes along the way.
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" asChild>
            <Link href={createHref}>New {terms.formula}</Link>
          </Button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      {recipes == null && !error ? <p className="mt-4 text-sm text-muted-foreground">Loading {terms.formulas}…</p> : null}
      {recipes && recipes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No {terms.formula} yet. Add one before this product can be planned.</p>
      ) : null}
      {recipes && recipes.length > 0 ? (
        <ul className="mt-4 divide-y rounded-lg border">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/manufacturing/boms/${encodeURIComponent(recipe.id)}`} className="font-medium text-primary hover:underline">
                  {recipe.code} — {recipe.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {recipe.quantity} {recipe.uom} per batch · version {recipe.version}
                </p>
              </div>
              <Badge variant={recipe.lifecycle === "EFFECTIVE" || recipe.isActive ? "outline" : "secondary"}>{lifecycleLabel(recipe)}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
