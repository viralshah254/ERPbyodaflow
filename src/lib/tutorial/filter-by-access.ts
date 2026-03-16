/**
 * Filter tutorial chapters and items by user permissions, org type, and feature flags.
 */

import type { TutorialChapter } from "@/config/tutorial";
import { NAV_SECTIONS_CONFIG } from "@/config/navigation/sections";
import { useAuthStore } from "@/stores/auth-store";
import type { FeatureFlagKey } from "@/config/industryTemplates/index";
import { useOrgContextStore } from "@/stores/orgContextStore";

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
    if (permissions.length === 0) return true;
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
  hasFlag: (key: string) => boolean
): TutorialChapter[] {
  return chapters
    .map((chapter) => {
      const navSection = NAV_SECTIONS_CONFIG.find((s) => s.key === chapter.id);
      if (navSection?.requiresOrgTypes?.length && orgType) {
        const allowed = navSection.requiresOrgTypes as string[];
        if (!allowed.includes(orgType)) return null;
      }
      const accessibleItems = chapter.items.filter((item) => {
        const navItem = getNavItem(chapter.id, item.key);
        if (!navItem) return true;
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
  const permissions = useAuthStore((s) => s.permissions);
  const org = useAuthStore((s) => s.org);
  const orgHasFlag = useOrgContextStore((s) => s.hasFlag);
  const orgType = org?.orgType ?? null;
  const hasFlag = (key: string) => orgHasFlag(key as FeatureFlagKey);
  return filterTutorialChaptersByAccess(chapters, permissions, orgType, hasFlag);
}
