"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type FloaterId = "gaia" | "teamChat";

export type FloaterPos = {
  right: number;
  bottom: number;
};

const STORAGE_KEY = "odaflow-floater-positions";
const DRAG_THRESHOLD = 8;
const EDGE = 12;
const DRAG_Z = 100000;
const DEFAULT_SIZE = { w: 56, h: 56 };

type Store = Partial<Record<FloaterId, FloaterPos>>;

function loadAll(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readStored(id: FloaterId): FloaterPos | null {
  const stored = loadAll()[id];
  if (!stored || typeof stored.right !== "number" || typeof stored.bottom !== "number") {
    return null;
  }
  if (!Number.isFinite(stored.right) || !Number.isFinite(stored.bottom)) return null;
  return stored;
}

function saveOne(id: FloaterId, pos: FloaterPos | null) {
  const all = loadAll();
  if (pos) all[id] = pos;
  else delete all[id];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
}

let cachedInsets: { top: number; right: number; bottom: number; left: number } | null = null;

function getSafeInsets() {
  if (cachedInsets) return cachedInsets;
  if (typeof document === "undefined") return { top: 0, right: 0, bottom: 0, left: 0 };
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);visibility:hidden;pointer-events:none;";
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  cachedInsets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  el.remove();
  return cachedInsets;
}

function clampPos(pos: FloaterPos, size: { w: number; h: number }): FloaterPos {
  const insets = getSafeInsets();
  const minRight = EDGE + insets.right;
  const minBottom = EDGE + insets.bottom;
  const maxRight = Math.max(minRight, window.innerWidth - size.w - EDGE - insets.left);
  const maxBottom = Math.max(minBottom, window.innerHeight - size.h - EDGE - insets.top);
  return {
    right: Math.min(Math.max(pos.right, minRight), maxRight),
    bottom: Math.min(Math.max(pos.bottom, minBottom), maxBottom),
  };
}

function measureOrb(root: HTMLElement | null, fallback: { w: number; h: number }) {
  const orb = root?.querySelector('[data-floater-orb="true"]') as HTMLElement | null;
  const r = orb?.getBoundingClientRect();
  if (r && r.width && r.height) return { w: r.width, h: r.height };
  return fallback;
}

export function useDraggableFloater(id: FloaterId) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<FloaterPos | null>(() =>
    typeof window === "undefined" ? null : readStored(id)
  );
  const [isDragging, setIsDragging] = useState(false);
  const posRef = useRef(pos);
  const sizeRef = useRef(DEFAULT_SIZE);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    right: number;
    bottom: number;
  } | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);

  posRef.current = pos;

  const applyPos = useCallback((next: FloaterPos) => {
    posRef.current = next;
    setPos(next);
  }, []);

  const reset = useCallback(() => {
    posRef.current = null;
    setPos(null);
    setIsDragging(false);
    draggingRef.current = false;
    dragStartRef.current = null;
    saveOne(id, null);
  }, [id]);

  useLayoutEffect(() => {
    const current = posRef.current;
    if (!current) return;
    const size = measureOrb(rootRef.current, sizeRef.current);
    sizeRef.current = size;
    const next = clampPos(current, size);
    if (next.right !== current.right || next.bottom !== current.bottom) {
      applyPos(next);
      saveOne(id, next);
    }
  }, [id, applyPos]);

  useEffect(() => {
    const reclamp = () => {
      cachedInsets = null;
      const current = posRef.current;
      if (!current) return;
      const size = measureOrb(rootRef.current, sizeRef.current);
      sizeRef.current = size;
      const next = clampPos(current, size);
      applyPos(next);
      saveOne(id, next);
    };
    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
    };
  }, [id, applyPos]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const orb = e.currentTarget;
    try {
      orb.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    const rect = orb.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
    const current = posRef.current ?? {
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom,
    };
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      right: current.right,
      bottom: current.bottom,
    };
    draggingRef.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const start = dragStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.pointerX;
      const dy = e.clientY - start.pointerY;
      if (!draggingRef.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        draggingRef.current = true;
        setIsDragging(true);
      }
      applyPos(
        clampPos(
          { right: start.right - dx, bottom: start.bottom - dy },
          sizeRef.current
        )
      );
    },
    [applyPos]
  );

  const endDrag = useCallback(() => {
    dragStartRef.current = null;
    if (!draggingRef.current) return;
    suppressClickRef.current = true;
    draggingRef.current = false;
    setIsDragging(false);
    if (posRef.current) saveOne(id, posRef.current);
  }, [id]);

  const onClick = useCallback(
    (
      e: ReactMouseEvent<HTMLButtonElement>,
      onActivate?: (event: ReactMouseEvent<HTMLButtonElement>) => void
    ) => {
      if (suppressClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = false;
        return;
      }
      onActivate?.(e);
    },
    []
  );

  const getOrbProps = useCallback(
    (onActivate?: (event: ReactMouseEvent<HTMLButtonElement>) => void) => ({
      "data-floater-orb": "true" as const,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClick: (e: ReactMouseEvent<HTMLButtonElement>) => onClick(e, onActivate),
      style: {
        touchAction: "none" as const,
        userSelect: "none" as const,
      },
    }),
    [endDrag, onClick, onPointerDown, onPointerMove]
  );

  const hasCustomPosition = pos !== null;

  const rootStyle: CSSProperties | undefined = hasCustomPosition
    ? {
        right: pos.right,
        bottom: pos.bottom,
        left: "auto",
        top: "auto",
        zIndex: isDragging ? DRAG_Z : undefined,
      }
    : isDragging
      ? { zIndex: DRAG_Z }
      : undefined;

  return {
    rootRef,
    rootStyle,
    pos,
    isDragging,
    hasCustomPosition,
    getOrbProps,
    reset,
  };
}
