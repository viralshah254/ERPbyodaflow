"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function PricingWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const tab = (href: string, label: string, match: string) => {
    const active = path.includes(match);
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
      </Link>
    );
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b bg-background px-6 pt-2">
        <nav className="flex flex-wrap gap-1" aria-label="Pricing workspace">
          {tab("/pricing/workspace/overview", "Overview", "/workspace/overview")}
          {tab("/pricing/workspace/lists", "Price lists", "/workspace/lists")}
          {tab("/pricing/workspace/approvals", "Approvals", "/workspace/approvals")}
          <Link
            href="/pricing/rules"
            className={cn(
              "ml-auto inline-flex items-center border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              path.startsWith("/pricing/rules") && "text-foreground"
            )}
          >
            Rules →
          </Link>
        </nav>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
