"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { buildVisibleNav, type ResolvedNavSection, type ResolvedNavItem } from "@/config/navigation";
import { NAV_SECTIONS_CONFIG } from "@/config/navigation";
import type { TemplateOrgType, ModuleKey } from "@/config/industryTemplates/index";
import { NavSection } from "./NavSection";
import { useNavCounts } from "@/lib/use-nav-counts";
import type { NavCounts } from "@/lib/api/nav-counts";
import * as Icons from "lucide-react";

function applyCountsToItems(items: ResolvedNavItem[], counts: NavCounts): ResolvedNavItem[] {
  return items.map((item) => {
    const count = counts[item.key] ?? 0;
    const children = item.children ? applyCountsToItems(item.children, counts) : undefined;
    const badge =
      count > 0
        ? { type: "count" as const, value: String(count) }
        : item.badge?.type === "text"
          ? item.badge
          : undefined;
    return { ...item, badge, children };
  });
}

/** Map legacy orgType SHOP to RETAIL for template-driven nav */
function toTemplateOrgType(orgType: string | undefined): TemplateOrgType | null {
  if (!orgType) return null;
  if (orgType === "SHOP") return "RETAIL";
  return orgType as TemplateOrgType;
}

const ALL_MODULES = [
  "dashboard", "inventory", "sales", "purchasing", "pricing", "finance",
  "manufacturing", "distribution", "franchise", "retail", "crm", "projects", "payroll", "reports", "automation", "analytics", "settings", "docs",
] as const;
const DEFAULT_NAV_ORDER = NAV_SECTIONS_CONFIG.map((s) => s.key);

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { user, org, permissions } = useAuthStore();
  const {
    orgType: ctxOrgType,
    enabledModules,
    featureFlags,
    template,
    orgRole,
    franchisePersona,
  } = useOrgContextStore();
  const navCounts = useNavCounts();

  const FRANCHISEE_MODULES: ModuleKey[] = ["dashboard", "sales", "purchasing", "inventory", "franchise", "reports", "settings", "docs"];

  const visibleSections = React.useMemo((): ResolvedNavSection[] => {
    const orgType = toTemplateOrgType(ctxOrgType ?? org?.orgType ?? undefined);
    const isFranchiseePersona = franchisePersona === "LIGHT_ERP" || orgRole === "FRANCHISEE";
    const baseModules = enabledModules.length > 0 ? enabledModules : [...ALL_MODULES];
    const resolvedModules = isFranchiseePersona
      ? FRANCHISEE_MODULES
      : template?.enabledModules?.length
        ? [...new Set([...baseModules, ...template.enabledModules])]
        : baseModules;
    // docs included so "Document Center" section is available for outlets.
    const personaNav = isFranchiseePersona
      ? ["core", "sales", "purchasing", "inventory", "franchise", "docs", "settings"]
      : null;
    const input = {
      orgType,
      enabledModules: resolvedModules,
      featureFlags: featureFlags ?? {},
      defaultNav: personaNav ?? (template?.defaultNav?.length ? template.defaultNav : DEFAULT_NAV_ORDER),
      terminology: template?.terminology ?? {},
      user,
      permissions,
      orgRole: orgRole ?? undefined,
      // Franchisee: render only the sections explicitly listed above — no extra appending.
      strictSections: isFranchiseePersona,
    };
    const sections = buildVisibleNav(input);

    // For franchisees, restrict purchasing and inventory to the relevant outlet items only.
    if (!isFranchiseePersona) return sections;

    const PURCHASING_ALLOWED = new Set(["purchasing-requests", "purchasing-orders"]);
    const INVENTORY_ALLOWED = new Set([
      "inventory-products",
      "inventory-stock-levels",
      "inventory-movements",
      "inventory-receipts",
    ]);

    return sections.map((section) => {
      if (section.key === "purchasing") {
        return { ...section, items: section.items.filter((i) => PURCHASING_ALLOWED.has(i.key)) };
      }
      if (section.key === "inventory") {
        return { ...section, items: section.items.filter((i) => INVENTORY_ALLOWED.has(i.key)) };
      }
      return section;
    }).filter((section) => section.items.length > 0);
  }, [ctxOrgType, org?.orgType, enabledModules, featureFlags, template, user, permissions, orgRole, franchisePersona]);

  const sectionsWithCounts = React.useMemo(
    () => visibleSections.map((section) => ({
      ...section,
      items: applyCountsToItems(section.items, navCounts),
    })),
    [visibleSections, navCounts]
  );

  const primarySections = React.useMemo(
    () => sectionsWithCounts.filter((s) => s.tier === "primary"),
    [sectionsWithCounts]
  );

  const secondarySections = React.useMemo(
    () =>
      sectionsWithCounts
        .filter((s) => s.tier !== "primary")
        .sort((a, b) => a.label.localeCompare(b.label)),
    [sectionsWithCounts]
  );

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all",
        sidebarCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <Icons.Box className="h-5 w-5" />
            </div>
            <span className="font-semibold">
              {franchisePersona === "LIGHT_ERP" || orgRole === "FRANCHISEE" ? "OdaFlow Outlet ERP" : "OdaFlow ERP"}
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground mx-auto">
            <Icons.Box className="h-5 w-5" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto"
        >
          {sidebarCollapsed ? (
            <Icons.ChevronRight className="h-4 w-4" />
          ) : (
            <Icons.ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <nav className="p-2 space-y-4">
          {primarySections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              isCollapsed={sidebarCollapsed}
            />
          ))}

          {!sidebarCollapsed && secondarySections.length > 0 && (
            <div className="px-3 pt-1 pb-1">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">More</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          {secondarySections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              isCollapsed={sidebarCollapsed}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
