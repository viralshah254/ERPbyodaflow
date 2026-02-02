"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { getModulesForOrgType } from "@/lib/modules";
import { useTemplateStore } from "@/stores/template-store";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { org } = useAuthStore();
  const { selectedTemplate, terminology, enabledModules } = useTemplateStore();

  const modules = org ? getModulesForOrgType(org.orgType) : [];
  
  // Filter modules based on template
  const filteredModules = React.useMemo(() => {
    if (!selectedTemplate) return modules;
    return modules.filter((module) => 
      enabledModules.includes(module.id) || 
      enabledModules.some(id => module.id.startsWith(id))
    );
  }, [modules, selectedTemplate, enabledModules]);

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Circle;
    return Icon;
  };

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all",
        sidebarCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
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

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {filteredModules.map((module) => {
            const Icon = getIcon(module.icon);
            const isActive = pathname?.startsWith(module.path);
            const hasChildren = module.children && module.children.length > 0;

            if (hasChildren && !sidebarCollapsed) {
              return (
                <div key={module.id} className="space-y-1">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    {module.label}
                  </div>
                  {module.children?.map((child) => {
                    const ChildIcon = getIcon(child.icon);
                    const isChildActive = pathname === child.path;
                    // Apply terminology if available
                    const navOverride = selectedTemplate?.navOverrides?.[child.id as keyof typeof selectedTemplate.navOverrides];
                    const termLabel = terminology[child.name];
                    const displayLabel = navOverride || termLabel || child.label;
                    return (
                      <Link key={child.id} href={child.path}>
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            isChildActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{displayLabel}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <TooltipProvider key={module.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={module.path}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          sidebarCollapsed && "justify-center",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {!sidebarCollapsed && <span>{module.label}</span>}
                      </div>
                    </Link>
                  </TooltipTrigger>
                  {sidebarCollapsed && (
                    <TooltipContent side="right">
                      <p>{module.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

