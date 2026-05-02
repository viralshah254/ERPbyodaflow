"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function FranchiseNetworkLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const isOutlets = path.includes("/network/outlets");
  const isOverview = path.includes("/network/overview");
  const tabClass = (active: boolean) =>
    cn(
      "inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors",
      active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b bg-background px-6 pt-2">
        <nav className="flex gap-1" aria-label="Franchise network">
          <Link href="/franchise/network/outlets" className={tabClass(isOutlets)}>
            Outlets
          </Link>
          <Link href="/franchise/network/overview" className={tabClass(isOverview)}>
            Overview
          </Link>
        </nav>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
