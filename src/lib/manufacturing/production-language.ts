import { canonicalIndustryTemplateId, FMCG_BAKERY_TEMPLATE_ID } from "@/config/industry";

export type ProductionVoice = "plant" | "bakery" | "general";

export function productionVoice(templateId?: string | null): ProductionVoice {
  const id = canonicalIndustryTemplateId(templateId);
  if (id === FMCG_BAKERY_TEMPLATE_ID) return "bakery";
  if (id === "fmcg-manufacturer") return "plant";
  return "general";
}

export type ProductionTerms = {
  formula: string;
  formulas: string;
  formulaTitle: string;
  formulasTitle: string;
  flow: string;
  run: string;
  runs: string;
  library: string;
  governance: string;
  newFormula: string;
  nameLabel: string;
  covered: string;
  listed: string;
  emptyPlan: string;
  planDescription: string;
  makeNote: string;
  treeTitle: string;
  buyWithoutFormula: string;
};

const GENERAL: ProductionTerms = {
  formula: "recipe",
  formulas: "recipes",
  formulaTitle: "Recipe",
  formulasTitle: "Recipes",
  flow: "Recipe to finished goods",
  run: "production batch",
  runs: "production batches",
  library: "Recipe library",
  governance: "Recipe governance",
  newFormula: "New BOM",
  nameLabel: "Recipe name",
  covered: "On-hand covers this recipe.",
  listed: "Only active products with a recipe are listed. Calculate before creating drafts; drafts do not send instructions or add stock.",
  emptyPlan: "No finished products with a recipe were found.",
  planDescription: "Plan finished output, calculate ingredients, then prepare and release batches to production.",
  makeNote: "These have a recipe. Get more by completing work orders, not by buying the SKU. Click a name for stock levels.",
  treeTitle: "Recipe tree",
  buyWithoutFormula: "Usable stock is short, and this item has no recipe, so the plan would buy it. Add a recipe if you make it.",
};

const PLANT: ProductionTerms = {
  formula: "blend formula",
  formulas: "blend formulas",
  formulaTitle: "Blend formula",
  formulasTitle: "Blend formulas",
  flow: "Blend formula to finished goods",
  run: "production run",
  runs: "production runs",
  library: "Blend formula library",
  governance: "Formula governance",
  newFormula: "New blend formula",
  nameLabel: "Blend formula name",
  covered: "On-hand covers this blend formula.",
  listed: "Only finished SKUs with a blend formula are listed. A SKU without one cannot be planned here, and material planning will offer to buy it. Drafts do not send instructions or add stock.",
  emptyPlan: "No finished products with a blend formula were found. Add one before the plant can plan a run.",
  planDescription: "Plan the finished SKUs the plant will make, calculate the blend formula, then prepare and release production runs.",
  makeNote: "These have a blend formula. Make more by completing a production run. Buying the finished SKU is for items the plant does not make.",
  treeTitle: "Blend formula",
  buyWithoutFormula: "Usable stock is short, and this item has no blend formula, so the plan would buy it. Add a blend formula if the plant makes it.",
};

const BAKERY: ProductionTerms = {
  ...GENERAL,
  newFormula: "New recipe",
  buyWithoutFormula: "Usable stock is short, and this item has no recipe, so the plan would buy it. Add a recipe if the bakery makes it.",
};

export function productionTerms(templateId?: string | null): ProductionTerms {
  const voice = productionVoice(templateId);
  if (voice === "plant") return PLANT;
  if (voice === "bakery") return BAKERY;
  return GENERAL;
}

const PURCHASE_WITHOUT_FORMULA = /purchase this component|no active formula/i;

export function displayMrpReason(reason: string, templateId?: string | null): string {
  if (!PURCHASE_WITHOUT_FORMULA.test(reason)) return reason;
  return productionTerms(templateId).buyWithoutFormula;
}

export function setupTaskPresentation(
  id: string,
  title: string,
  detail: string,
  action: string,
  templateId?: string | null,
): { title: string; detail: string; action: string } {
  if (id !== "recipes" || productionVoice(templateId) !== "plant") return { title, detail, action };
  return {
    title: "Reviewed blend formulas",
    detail: detail
      .replace(/\brecipes\b/gi, "blend formulas")
      .replace(/\brecipe\b/gi, "blend formula")
      .replace(/\b1 active blend formulas need\b/g, "1 active blend formula needs"),
    action: "Review blend formulas",
  };
}
