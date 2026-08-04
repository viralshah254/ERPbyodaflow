"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { ProfileGrid, ProfileGridHeader } from "./ProfileGrid";
import { ToolsGrid } from "./ToolsGrid";
import { cn } from "@/lib/utils";
import { GripHorizontal, RotateCcw, X } from "lucide-react";

type AccessibilityPanelProps = {
  oversized?: boolean;
  onClose: () => void;
  onDragHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHandlePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHandlePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
};

export function AccessibilityPanel({
  oversized,
  onClose,
  onDragHandlePointerDown,
  onDragHandlePointerMove,
  onDragHandlePointerUp,
}: AccessibilityPanelProps) {
  const resetAll = useAccessibilityStore((s) => s.resetAll);
  const setWidgetHidden = useAccessibilityStore((s) => s.setWidgetHidden);

  return (
    <div
      id="a11y-panel"
      role="dialog"
      aria-labelledby="a11y-panel-title"
      aria-describedby="a11y-panel-description"
      className={cn(
        "flex w-[min(360px,calc(100vw-2rem))] max-h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
        oversized && "w-[min(400px,calc(100vw-2rem))]"
      )}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none items-center gap-2 border-b bg-muted/40 px-3 py-2 active:cursor-grabbing"
        onPointerDown={onDragHandlePointerDown}
        onPointerMove={onDragHandlePointerMove}
        onPointerUp={onDragHandlePointerUp}
        onPointerCancel={onDragHandlePointerUp}
        aria-label="Drag to move accessibility widget"
        title="Swipe or drag to move"
      >
        <GripHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 id="a11y-panel-title" className="truncate text-sm font-semibold">
            Accessibility
          </h2>
          <p id="a11y-panel-description" className="truncate text-xs text-muted-foreground">
            Drag to reposition · page stays visible
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label="Close accessibility panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="profiles" className="flex min-h-0 flex-1 flex-col px-4 pt-3">
        <TabsList className="grid w-full shrink-0 grid-cols-2">
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>
        <TabsContent
          value="profiles"
          className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        >
          <ProfileGridHeader />
          <ProfileGrid />
        </TabsContent>
        <TabsContent
          value="tools"
          className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
        >
          <ToolsGrid />
        </TabsContent>
      </Tabs>

      <div className="flex shrink-0 flex-col gap-2 border-t px-4 py-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1 text-destructive hover:text-destructive"
          onClick={() => resetAll()}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setWidgetHidden(true);
            onClose();
          }}
        >
          Hide Widget
        </Button>
      </div>
    </div>
  );
}
