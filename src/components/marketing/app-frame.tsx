"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AppFrameProps {
  children: React.ReactNode;
  className?: string;
  showChrome?: boolean;
}

export function AppFrame({
  children,
  className,
  showChrome = true,
}: AppFrameProps) {
  if (!showChrome) {
    return <div className={cn("rounded-2xl overflow-hidden", className)}>{children}</div>;
  }

  return (
    <div className={cn("rounded-2xl overflow-hidden border shadow-xl dark:shadow-2xl transition-shadow", className)}>
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 bg-muted/50 dark:bg-muted/30 px-4 py-2 border-b">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500 dark:bg-red-600" />
          <div className="h-3 w-3 rounded-full bg-yellow-500 dark:bg-yellow-600" />
          <div className="h-3 w-3 rounded-full bg-green-500 dark:bg-green-600" />
        </div>
        <div className="flex-1 mx-4">
          <div className="h-6 rounded bg-background/50 dark:bg-background/30 border text-xs flex items-center px-3 text-muted-foreground">
            erp.odaflow.com
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="bg-background">{children}</div>
    </div>
  );
}

