"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ODA_BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { DictionaryPopover } from "./DictionaryPopover";
import { PageStructureOverlay } from "./PageStructureOverlay";
import { Accessibility, Eye } from "lucide-react";

const LAUNCHER_SIZE = 52;
const PANEL_GAP = 8;
const PANEL_WIDTH = 360;
const PANEL_MAX_HEIGHT = 640;
const DEFAULT_MARGIN = 24;
const DRAG_THRESHOLD = 3;

function getDefaultPosition() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth - LAUNCHER_SIZE - DEFAULT_MARGIN,
    y: window.innerHeight - LAUNCHER_SIZE - DEFAULT_MARGIN,
  };
}

function getWidgetDimensions(panelOpen: boolean, oversized: boolean) {
  const scale = oversized ? 1.25 : 1;
  const launcher = LAUNCHER_SIZE * scale;
  const panelW = Math.min(PANEL_WIDTH, window.innerWidth - 16) * scale;
  const panelH = Math.min(window.innerHeight * 0.7, PANEL_MAX_HEIGHT) * scale;

  if (!panelOpen) {
    return { width: launcher, height: launcher };
  }

  return {
    width: Math.max(launcher, panelW),
    height: panelH + PANEL_GAP + launcher,
  };
}

function clampPosition(
  x: number,
  y: number,
  panelOpen: boolean,
  oversized: boolean
) {
  if (typeof window === "undefined") return { x, y };
  const { width, height } = getWidgetDimensions(panelOpen, oversized);
  const maxX = window.innerWidth - width - 8;
  const maxY = window.innerHeight - height - 8;
  return {
    x: Math.max(8, Math.min(x, maxX)),
    y: Math.max(8, Math.min(y, maxY)),
  };
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

export function AccessibilityWidget() {
  const panelOpen = useAccessibilityStore((s) => s.panelOpen);
  const setPanelOpen = useAccessibilityStore((s) => s.setPanelOpen);
  const widget = useAccessibilityStore((s) => s.widget);
  const tools = useAccessibilityStore((s) => s.tools);
  const setWidgetHidden = useAccessibilityStore((s) => s.setWidgetHidden);
  const setWidgetPosition = useAccessibilityStore((s) => s.setWidgetPosition);
  const hydrated = useAccessibilityStore((s) => s.hydrated);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<DragState | null>(null);
  const captureTargetRef = useRef<HTMLElement | null>(null);

  const oversized = widget.oversized || tools.oversizedWidget;
  const scale = oversized ? 1.25 : 1;

  useEffect(() => {
    if (!hydrated) return;
    const initial = widget.position ?? getDefaultPosition();
    setPos(clampPosition(initial.x, initial.y, panelOpen, oversized));
  }, [hydrated, widget.position, panelOpen, oversized]);

  useEffect(() => {
    const onResize = () =>
      setPos((p) => clampPosition(p.x, p.y, panelOpen, oversized));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [panelOpen, oversized]);

  useEffect(() => {
    setPos((p) => clampPosition(p.x, p.y, panelOpen, oversized));
  }, [panelOpen, oversized]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, setPanelOpen]);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        moved: false,
      };
      captureTargetRef.current = e.currentTarget;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pos.x, pos.y]
  );

  const moveDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        drag.moved = true;
      }
      setPos(clampPosition(drag.originX + dx, drag.originY + dy, panelOpen, oversized));
    },
    [panelOpen, oversized]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return false;
      if (captureTargetRef.current) {
        captureTargetRef.current.releasePointerCapture(e.pointerId);
        captureTargetRef.current = null;
      }
      let wasMoved = drag.moved;
      if (drag.moved) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const final = clampPosition(
          drag.originX + dx,
          drag.originY + dy,
          panelOpen,
          oversized
        );
        setPos(final);
        setWidgetPosition(final);
      }
      dragRef.current = null;
      return wasMoved;
    },
    [panelOpen, oversized, setWidgetPosition]
  );

  const onLauncherPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startDrag(e);
  };

  const onLauncherPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const moved = endDrag(e);
    if (!moved) setPanelOpen(!panelOpen);
  };

  if (!hydrated) return null;

  if (widget.hidden) {
    return (
      <>
        <PageStructureOverlay active={tools.pageStructure} />
        {tools.dictionary ? <DictionaryPopover /> : null}
        <button
          type="button"
          onClick={() => setWidgetHidden(false)}
          className="fixed bottom-4 right-0 z-[10045] rounded-l-md border border-r-0 bg-background px-2 py-3 text-xs font-medium shadow-md hover:bg-muted"
          aria-label="Show accessibility widget"
        >
          <Eye className="h-4 w-4" />
        </button>
      </>
    );
  }

  return (
    <>
      <PageStructureOverlay active={tools.pageStructure} />
      {tools.dictionary ? <DictionaryPopover /> : null}

      <div
        className="fixed z-[10045] flex touch-none flex-col"
        style={{
          left: pos.x,
          top: pos.y,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          gap: PANEL_GAP,
        }}
      >
        {panelOpen ? (
          <AccessibilityPanel
            oversized={oversized}
            onClose={() => setPanelOpen(false)}
            onDragHandlePointerDown={startDrag}
            onDragHandlePointerMove={moveDrag}
            onDragHandlePointerUp={endDrag}
          />
        ) : null}

        <Button
          type="button"
          size="icon"
          onPointerDown={onLauncherPointerDown}
          onPointerMove={moveDrag}
          onPointerUp={onLauncherPointerUp}
          onPointerCancel={onLauncherPointerUp}
          className={cn(
            "h-[52px] w-[52px] shrink-0 self-end rounded-full shadow-lg ring-2 ring-white/20 touch-none",
            "hover:scale-105 active:scale-95 transition-transform",
            panelOpen && "ring-primary/40"
          )}
          style={{ backgroundColor: ODA_BRAND.navy, color: "#fff" }}
          aria-expanded={panelOpen}
          aria-controls="a11y-panel"
          aria-label="Open accessibility settings. Swipe or drag to move."
          title="Accessibility — swipe or drag to move"
        >
          <Accessibility className="h-6 w-6" />
        </Button>
      </div>
    </>
  );
}
