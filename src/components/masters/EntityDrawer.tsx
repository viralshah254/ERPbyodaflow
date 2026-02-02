"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface EntityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  mode: "create" | "edit";
  /** Stub: duplicate detection warning (e.g. "Possible duplicate: similar SKU exists") */
  duplicateWarning?: React.ReactNode;
  /** Footer actions. Defaults to Save + Cancel. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function EntityDrawer({
  open,
  onOpenChange,
  title,
  description,
  mode,
  duplicateWarning,
  footer,
  children,
  className,
}: EntityDrawerProps) {
  const defaultFooter = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button onClick={() => onOpenChange(false)}>
        {mode === "create" ? "Create" : "Save"}
      </Button>
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("flex flex-col w-full sm:max-w-lg", className)}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>
        {duplicateWarning && (
          <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {duplicateWarning}
          </div>
        )}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {children}
        </ScrollArea>
        <SheetFooter className="mt-4 shrink-0 border-t pt-4">
          {footer ?? defaultFooter}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
