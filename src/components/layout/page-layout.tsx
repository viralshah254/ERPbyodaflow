"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "./page-header";

interface PageLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={actions}
        showCommandHint={false}
        sticky={false}
      />
      {/* Content — scroll inside page card/sections, not the app chrome */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}





