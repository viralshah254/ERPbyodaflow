"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { buildVisibleNav, type ResolvedNavSection } from "@/config/navigation";
import { NAV_SECTIONS_CONFIG } from "@/config/navigation";
import type { TemplateOrgType } from "@/config/industryTemplates/index";
import { NavSection } from "./NavSection";
import * as Icons from "lucide-react";

/** Map legacy orgType SHOP to RETAIL for template-driven nav */
function toTemplateOrgType(orgType: string | undefined): TemplateOrgType | null {
  if (!orgType) return null;
  if (orgType === "SHOP") return "RETAIL";
  return orgType as TemplateOrgType;
}

const ALL_MODULES = [
  "dashboard", "inventory", "sales", "purchasing", "pricing", "finance",
  "manufacturing", "distribution", "retail", "crm", "projects", "payroll", "reports", "automation", "analytics", "settings", "docs",
] as const;
const DEFAULT_NAV_ORDER = NAV_SECTIONS_CONFIG.map((s) => s.key);

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { user, org } = useAuthStore();
  const {
    orgType: ctxOrgType,
    enabledModules,
    featureFlags,
    template,
  } = useOrgContextStore();

  const visibleSections = React.useMemo((): ResolvedNavSection[] => {
    const orgType = toTemplateOrgType(ctxOrgType ?? org?.orgType ?? undefined);
    const baseModules = enabledModules.length > 0 ? enabledModules : [...ALL_MODULES];
    const resolvedModules =
      template?.enabledModules?.length
        ? [...new Set([...baseModules, ...template.enabledModules])]
        : baseModules;
    const input = {
      orgType,
      enabledModules: resolvedModules,
      featureFlags: featureFlags ?? {},
      defaultNav: template?.defaultNav?.length ? template.defaultNav : DEFAULT_NAV_ORDER,
      terminology: template?.terminology ?? {},
      user,
    };
    return buildVisibleNav(input);
  }, [ctxOrgType, org?.orgType, enabledModules, featureFlags, template, user]);

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
            <span className="font-semibold">OdaFlow ERP</span>
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

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ScrollArea className="h-full">
          <nav className="p-2 space-y-4">
            {visibleSections.map((section) => (
              <NavSection
                key={section.id}
                section={section}
                isCollapsed={sidebarCollapsed}
              />
            ))}
          </nav>
        </ScrollArea>
      </div>
    </div>
  );
}
