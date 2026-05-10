"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { type ResolvedNavSection, type ResolvedNavItem } from "@/config/navigation";
import { applySidebarLayout, splitSectionsMainAndMore, type SidebarLayout } from "@/config/navigation/sidebar-layout";
import {
  computeDashboardSidebarModules,
  computeDashboardSidebarSections,
} from "@/lib/nav/compute-dashboard-sidebar-sections";
import { fetchPreferencesApi } from "@/lib/api/preferences";
import { isApiConfigured } from "@/lib/api/client";
import Link from "next/link";
import { OdaLogo } from "@/components/brand/OdaLogo";
import { ODA_BRAND } from "@/lib/brand";
import { NavSection } from "./NavSection";
import { useNavCounts } from "@/lib/use-nav-counts";
import type { NavCounts } from "@/lib/api/nav-counts";
import * as Icons from "lucide-react";

function applyCountsToItems(
  items: ResolvedNavItem[],
  counts: NavCounts,
  franchisorInboundMerge: boolean
): ResolvedNavItem[] {
  return items.map((item) => {
    let count = counts[item.key] ?? 0;
    if (franchisorInboundMerge && item.key === "sales-orders") {
      count += counts["franchise-inbound-orders"] ?? 0;
    }
    const children = item.children ? applyCountsToItems(item.children, counts, franchisorInboundMerge) : undefined;
    const badge =
      count > 0
        ? { type: "count" as const, value: String(count) }
        : item.badge?.type === "text"
          ? item.badge
          : undefined;
    return { ...item, badge, children };
  });
}

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarPreferencesRevision } = useUIStore();
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

  const [sidebarLayout, setSidebarLayout] = React.useState<SidebarLayout | null | undefined>(undefined);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setSidebarLayout(null);
      return;
    }
    let cancelled = false;
    fetchPreferencesApi()
      .then((p) => {
        if (!cancelled) setSidebarLayout(p.sidebarLayout ?? null);
      })
      .catch(() => {
        if (!cancelled) setSidebarLayout(null);
      });
    return () => {
      cancelled = true;
    };
  }, [sidebarPreferencesRevision]);

  const navParams = React.useMemo(
    () => ({
      ctxOrgType,
      orgOrgType: org?.orgType,
      enabledModules,
      featureFlags: featureFlags ?? {},
      template,
      user,
      permissions,
      orgRole,
      franchisePersona,
    }),
    [ctxOrgType, org?.orgType, enabledModules, featureFlags, template, user, permissions, orgRole, franchisePersona]
  );

  const visibleSections = React.useMemo((): ResolvedNavSection[] => {
    const base = computeDashboardSidebarSections(navParams);
    const modules = computeDashboardSidebarModules(navParams);
    const pins = {
      dashboardEnabled: modules.includes("dashboard"),
      manufacturingEnabled: modules.includes("manufacturing"),
    };
    return applySidebarLayout(base, sidebarLayout === undefined ? undefined : sidebarLayout ?? undefined, pins);
  }, [navParams, sidebarLayout]);

  const franchisorInboundMerge =
    orgRole === "FRANCHISOR" && featureFlags?.franchiseNetworkMonitoring === true;

  const sectionsWithCounts = React.useMemo(
    () =>
      visibleSections.map((section) => ({
        ...section,
        items: applyCountsToItems(section.items, navCounts, franchisorInboundMerge),
      })),
    [visibleSections, navCounts, franchisorInboundMerge]
  );

  const layoutForRails = sidebarLayout === undefined ? null : sidebarLayout;

  const { main: primarySections, more: secondarySections } = React.useMemo(
    () => splitSectionsMainAndMore(sectionsWithCounts, layoutForRails),
    [sectionsWithCounts, layoutForRails]
  );

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all",
        sidebarCollapsed ? "w-16" : "w-[17.5rem] min-w-[17.5rem]",
        className
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b px-1 gap-0.5",
          sidebarCollapsed ? "flex-col justify-center py-1.5" : "justify-between px-2"
        )}
      >
        {!sidebarCollapsed ? (
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2 pr-1">
            <OdaLogo height={30} className="min-w-0 shrink" />
            <span className="truncate text-sm font-semibold">
              {franchisePersona === "LIGHT_ERP" || orgRole === "FRANCHISEE" ? "Outlet" : "OdaFlow"}
            </span>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            aria-label="Oda ERP"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md"
            style={{ backgroundColor: ODA_BRAND.navy }}
          >
            <img src={ODA_BRAND.logoSrc} alt="" className="h-7 w-12 max-w-none object-contain object-left" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn("shrink-0", sidebarCollapsed && "mt-0.5 h-8 w-8")}
        >
          {sidebarCollapsed ? (
            <Icons.ChevronRight className="h-4 w-4" />
          ) : (
            <Icons.ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <nav className="p-3 pb-6 space-y-0">
          {primarySections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              isCollapsed={sidebarCollapsed}
            />
          ))}

          {!sidebarCollapsed && secondarySections.length > 0 && (
            <div className="mx-2 my-5">
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
