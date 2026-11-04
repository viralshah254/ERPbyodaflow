/**
 * Filter tutorial chapters and items by user permissions, org type, and feature flags.
 */

import type { TutorialChapter } from "@/config/tutorial";
import { NAV_SECTIONS_CONFIG } from "@/config/navigation/sections";
import { useAuthStore } from "@/stores/auth-store";
import type { FeatureFlagKey } from "@/config/industryTemplates/index";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { buildVisibleNav } from "@/config/navigation";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";

function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes("*")) return true;
  if (userPermissions.includes(required)) return true;
  const wildcards = userPermissions.filter((p) => p.endsWith(".*"));
  for (const w of wildcards) {
    const prefix = w.replace(".*", "");
    if (required.startsWith(prefix + ".")) return true;
  }
  return false;
}

function itemHasAccess(
  item: { requiresPermissions?: string[]; requiresOrgTypes?: string[]; requiresFlags?: string[] },
  permissions: string[],
  orgType: string | null,
  hasFlag: (key: string) => boolean
): boolean {
  if (item.requiresPermissions?.length) {
    const hasPerm = item.requiresPermissions.some((p) => hasPermission(permissions, p));
    if (!hasPerm) return false;
  }
  if (item.requiresOrgTypes?.length && orgType) {
    if (!item.requiresOrgTypes.includes(orgType as "MANUFACTURER" | "DISTRIBUTOR" | "RETAIL")) return false;
  }
  if (item.requiresFlags?.length) {
    if (!item.requiresFlags.every((f) => hasFlag(f as FeatureFlagKey))) return false;
  }
  return true;
}

function getNavItem(sectionKey: string, itemKey: string) {
  const section = NAV_SECTIONS_CONFIG.find((s) => s.key === sectionKey);
  if (!section) return null;
  const find = (items: typeof section.items): (typeof section.items)[0] | null => {
    for (const it of items) {
      if (it.key === itemKey) return it;
      if (it.children) {
        const found = find(it.children);
        if (found) return found;
      }
    }
    return null;
  };
  return find(section.items);
}

/**
 * Filter tutorial chapters to only include items the user has access to.
 * Chapters with no accessible items are excluded.
 */
export function filterTutorialChaptersByAccess(
  chapters: TutorialChapter[],
  permissions: string[],
  orgType: string | null,
  hasFlag: (key: string) => boolean,
  options?: { visibleKeys: Set<string>; isPlatformOperator: boolean; fmcg: boolean; enabledModules: string[] }
): TutorialChapter[] {
  return chapters
    .map((chapter) => {
      const navSection = NAV_SECTIONS_CONFIG.find((s) => s.key === chapter.id);
      if (navSection?.requiresOrgTypes?.length && orgType) {
        const allowed = navSection.requiresOrgTypes as string[];
        if (!allowed.includes(orgType)) return null;
      }
      const accessibleItems = chapter.items.filter((item) => {
        if (item.requiresAllPermissions?.some((permission) => !hasPermission(permissions, permission))) return false;
        if (item.requiresModule && options && !options.enabledModules.includes(item.requiresModule)) return false;
        const navItem = getNavItem(chapter.id, item.key);
        if (navItem && options) return options.visibleKeys.has(item.key);
        if (!navItem) {
          if (item.requiresPlatformOperator && !options?.isPlatformOperator) return false;
          if (item.requiresFmcg && !options?.fmcg) return false;
          if (options && navSection?.moduleKey && !options.enabledModules.includes(navSection.moduleKey)) return false;
          return itemHasAccess(item, permissions, orgType, hasFlag);
        }
        return itemHasAccess(navItem, permissions, orgType, hasFlag);
      });
      if (accessibleItems.length === 0) return null;
      return { ...chapter, items: accessibleItems };
    })
    .filter((ch): ch is TutorialChapter => ch !== null);
}

/**
 * Hook to get tutorial chapters filtered by current user's access.
 */
export function useFilteredTutorialChapters(chapters: TutorialChapter[]): TutorialChapter[] {
  const auth = useAuthStore();
  const context = useOrgContextStore();
  return accessibleTutorialChapters(chapters, auth, context);
}

function accessibleTutorialChapters(chapters: TutorialChapter[], auth: ReturnType<typeof useAuthStore.getState>, context: ReturnType<typeof useOrgContextStore.getState>) {
  const visible = buildVisibleNav({ user: auth.user, permissions: auth.permissions, orgType: context.orgType, enabledModules: context.enabledModules, featureFlags: context.featureFlags, templateId: context.templateId, orgRole: context.orgRole, defaultNav: [], terminology: context.terminology });
  const visibleKeys = new Set<string>();
  const visit = (items: Array<{ key: string; children?: Array<{ key: string }> }>) => { for (const item of items) { visibleKeys.add(item.key); if (item.children) visit(item.children); } };
  visible.forEach((section) => visit(section.items));
  const filtered = filterTutorialChaptersByAccess(chapters, auth.permissions, auth.org?.orgType ?? context.orgType, (key) => context.hasFlag(key as FeatureFlagKey), { visibleKeys, isPlatformOperator: auth.isPlatformOperator, fmcg: context.industryCategory === "FMCG" || isFmcgOrg(context.templateId), enabledModules: context.enabledModules });
  const destinations = filtered.flatMap((chapter) => chapter.items.map((item) => item.href));
  return filtered.map((chapter) => ({ ...chapter, title: visible.find((section) => section.key === chapter.id)?.label ?? chapter.title, items: chapter.items.map((item) => ({ ...item, recommendedNextStep: item.recommendedNextStep && destinations.some((href) => item.recommendedNextStep!.href === href || item.recommendedNextStep!.href.startsWith(`${href}/`)) ? item.recommendedNextStep : undefined })) }));
}

export function getAccessibleTutorialChapters(chapters: TutorialChapter[]) {
  return accessibleTutorialChapters(chapters, useAuthStore.getState(), useOrgContextStore.getState());
}
