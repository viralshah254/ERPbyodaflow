"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  FileText,
  HeadphonesIcon,
  ClipboardList,
  Settings,
  Box,
} from "lucide-react";

const PLATFORM_NAV: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; permission?: string }[] = [
  { label: "Dashboard", href: "/platform", icon: LayoutDashboard },
  { label: "Customers", href: "/platform/customers", icon: Users, permission: "platform.read" },
  { label: "Team", href: "/platform/users", icon: UserPlus, permission: "platform.owner.manage" },
  { label: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard, permission: "platform.billing.read" },
  { label: "Billing", href: "/platform/billing", icon: FileText, permission: "platform.billing.read" },
  { label: "Customer Service", href: "/platform/support", icon: HeadphonesIcon, permission: "platform.support.read" },
  { label: "Audit", href: "/platform/audit", icon: ClipboardList, permission: "platform.audit.read" },
  { label: "Settings", href: "/platform/settings", icon: Settings, permission: "platform.read" },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions) ?? [];

  const visibleNav = React.useMemo(() => {
    const hasOwner = permissions.includes("platform.write");
    return PLATFORM_NAV.filter((item) => {
      if (!item.permission) return true;
      return hasOwner || permissions.includes(item.permission);
    });
  }, [permissions]);

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
          <Box className="h-5 w-5" />
        </div>
        <span className="font-semibold">OdaFlow Platform</span>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/platform" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
