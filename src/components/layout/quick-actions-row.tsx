"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: keyof typeof Icons;
  variant?: "default" | "outline" | "ghost";
}

interface QuickActionsRowProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionsRow({ actions, className }: QuickActionsRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {actions.map((action) => {
        const Icon = action.icon
          ? (Icons[action.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
          : null;
        const variant = action.variant ?? "outline";
        const content = (
          <>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{action.label}</span>
          </>
        );
        if (action.href) {
          return (
            <Button key={action.id} variant={variant} size="sm" asChild>
              <Link href={action.href}>{content}</Link>
            </Button>
          );
        }
        return (
          <Button
            key={action.id}
            variant={variant}
            size="sm"
            onClick={action.onClick}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
}
