"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RightPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Right column content for validations, next steps, Copilot. Toggle lives in PageHeader (showRightPanelToggle). */
export function RightPanel({ title, children, className }: RightPanelProps) {
  return (
    <Card className={cn("shrink-0 w-full flex flex-col overflow-hidden border-0 rounded-none shadow-none", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("flex-1 overflow-auto space-y-4 text-sm", !title && "pt-4")}>
        {children}
      </CardContent>
    </Card>
  );
}
