import type { IndustryTemplate } from "@/types/templates";

/**
 * Get label with terminology overrides
 */
export function getLabel(
  defaultLabel: string,
  moduleId: string,
  template: IndustryTemplate | null
): string {
  if (!template) {
    return defaultLabel;
  }

  // Check navOverrides first
  if (template.navOverrides?.[moduleId as keyof typeof template.navOverrides]) {
    return template.navOverrides[moduleId as keyof typeof template.navOverrides]!;
  }

  // Check terminology
  if (template.terminology[moduleId]) {
    return template.terminology[moduleId];
  }

  return defaultLabel;
}





