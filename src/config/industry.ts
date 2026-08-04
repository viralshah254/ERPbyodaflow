export type IndustryCategory = "FMCG" | "SEAFOOD" | "OTHER";

const FMCG_TEMPLATE_IDS = new Set([
  "fmcg-manufacturer",
  "fmcg-distributor",
  "retail-multi-store",
]);

const SEAFOOD_TEMPLATE_IDS = new Set([
  "seafood-distributor",
  "cool-catch",
  "coolcatch",
]);

export function industryCategoryLabel(category: IndustryCategory): string {
  if (category === "FMCG") return "FMCG";
  if (category === "SEAFOOD") return "Seafood";
  return "Other industry";
}

export function resolveIndustryCategoryFromTemplateId(templateId?: string | null): IndustryCategory {
  const id = templateId?.trim();
  if (!id) return "FMCG";
  if (FMCG_TEMPLATE_IDS.has(id)) return "FMCG";
  if (SEAFOOD_TEMPLATE_IDS.has(id)) return "SEAFOOD";
  return "OTHER";
}

export const INDUSTRY_CATEGORIES: Array<{
  value: IndustryCategory;
  label: string;
  description: string;
  icon: "Package" | "Fish" | "Layers";
}> = [
  {
    value: "FMCG",
    label: "FMCG",
    description: "Manufacturing, distribution, and retail consumer goods",
    icon: "Package",
  },
  {
    value: "SEAFOOD",
    label: "Seafood",
    description: "Perishable fish and seafood — scale sales, cold chain, franchise outlets",
    icon: "Fish",
  },
  {
    value: "OTHER",
    label: "Other industry",
    description: "Agro-logistics and other specialised verticals",
    icon: "Layers",
  },
];

export function filterTemplatesByIndustry<T extends { id: string; hidden?: boolean }>(
  templates: T[],
  industryCategory: IndustryCategory | null
): T[] {
  const visible = templates.filter((t) => !t.hidden);
  if (!industryCategory) return visible;
  if (industryCategory === "FMCG") {
    return visible.filter((t) => FMCG_TEMPLATE_IDS.has(t.id));
  }
  if (industryCategory === "SEAFOOD") {
    return visible.filter((t) => SEAFOOD_TEMPLATE_IDS.has(t.id));
  }
  return visible.filter(
    (t) => !FMCG_TEMPLATE_IDS.has(t.id) && !SEAFOOD_TEMPLATE_IDS.has(t.id)
  );
}
