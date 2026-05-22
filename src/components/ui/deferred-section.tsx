"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type DeferredSectionProps = {
  children: React.ReactNode;
  /** Shown until the section enters the viewport (then `onShow` runs once). */
  fallback?: React.ReactNode;
  /** Called once when the section becomes visible. */
  onShow?: () => void;
  rootMargin?: string;
  className?: string;
};

/**
 * Renders fallback until near-viewport, then children. Use to lazy-load heavy detail sections.
 */
export function DeferredSection({
  children,
  fallback = null,
  onShow,
  rootMargin = "120px",
  className,
}: DeferredSectionProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  const fired = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || fired.current) return;
        fired.current = true;
        setShown(true);
        onShow?.();
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown, onShow, rootMargin]);

  return (
    <div ref={ref} className={cn(className)}>
      {shown ? children : fallback}
    </div>
  );
}
