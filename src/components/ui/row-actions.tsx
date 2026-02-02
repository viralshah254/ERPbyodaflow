"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as Icons from "lucide-react";

interface RowAction {
  label: string;
  icon?: keyof typeof Icons;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface RowActionsProps {
  actions: RowAction[];
  align?: "start" | "end";
}

export function RowActions({ actions, align = "end" }: RowActionsProps) {
  if (actions.length === 0) return null;

  if (actions.length === 1) {
    const action = actions[0];
    const IconC = (action.icon ? Icons[action.icon] : Icons.MoreHorizontal) as React.ComponentType<{ className?: string }>;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={action.onClick}
        className={action.variant === "destructive" ? "text-destructive" : ""}
      >
        <IconC className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Icons.MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((action, index) => {
          const IconC = action.icon ? (Icons[action.icon] as React.ComponentType<{ className?: string }>) : undefined;
          const Item = (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              className={action.variant === "destructive" ? "text-destructive" : ""}
            >
              {IconC && <IconC className="mr-2 h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          );

          // Add separator before destructive actions
          if (action.variant === "destructive" && index > 0) {
            return (
              <React.Fragment key={index}>
                <DropdownMenuSeparator />
                {Item}
              </React.Fragment>
            );
          }

          return Item;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}





