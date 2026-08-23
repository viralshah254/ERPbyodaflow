"use client";

import type { ReactNode } from "react";

type FloaterTooltipProps = {
  label: string;
  hint?: string;
  hidden?: boolean;
  children: ReactNode;
};

export function FloaterTooltip({
  label,
  hint = "Drag to move",
  hidden,
  children,
}: FloaterTooltipProps) {
  return (
    <div className={`floater-tip${hidden ? " is-hidden" : ""}`}>
      {children}
      <span className="floater-tip__bubble" role="tooltip">
        <span className="floater-tip__label">{label}</span>
        <span className="floater-tip__hint">{hint}</span>
      </span>
    </div>
  );
}
