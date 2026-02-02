"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Bookmark, ChevronDown, Plus, Trash2 } from "lucide-react";

export interface SavedView {
  id: string;
  name: string;
  filters?: Record<string, string>;
  sort?: { key: string; dir: "asc" | "desc" };
  columnIds?: string[];
}

interface SavedViewsDropdownProps {
  views?: SavedView[];
  currentViewId?: string | null;
  onSelectView?: (id: string) => void;
  onSaveCurrent?: () => void;
  onDeleteView?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SavedViewsDropdown({
  views = [],
  currentViewId,
  onSelectView,
  onSaveCurrent,
  onDeleteView,
  disabled,
  className,
}: SavedViewsDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className={className}>
          <Bookmark className="h-4 w-4 mr-1.5" />
          Views
          <ChevronDown className="h-4 w-4 ml-1.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Saved views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {views.length === 0 ? (
          <DropdownMenuItem disabled>No saved views</DropdownMenuItem>
        ) : (
          views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onClick={() => {
                onSelectView?.(v.id);
                setOpen(false);
              }}
            >
              <span className={currentViewId === v.id ? "font-medium" : ""}>{v.name}</span>
              {onDeleteView && (
                <button
                  type="button"
                  className="ml-auto p-1 rounded hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteView(v.id);
                  }}
                  aria-label="Delete view"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onSaveCurrent?.(); setOpen(false); }}>
          <Plus className="h-4 w-4 mr-2" />
          Save current view
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
