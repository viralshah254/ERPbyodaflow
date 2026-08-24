"use client";

import * as React from "react";
import { motion } from "framer-motion";

export type GaiaOrbState = "idle" | "thinking" | "open";

type GaiaOrbProps = {
  state: GaiaOrbState;
  reducedMotion: boolean;
  open: boolean;
  isDragging?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLButtonElement>;
  "data-floater-orb"?: "true";
};

export function GaiaOrb({
  state,
  reducedMotion,
  open,
  isDragging,
  className,
  style,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...rest
}: GaiaOrbProps) {
  const freezeMotion = reducedMotion || isDragging;
  return (
    <motion.button
      type="button"
      className={`gaia-orb pointer-events-auto gaia-orb--${state}${isDragging ? " is-dragging" : ""}${className ? ` ${className}` : ""}`}
      aria-label={open ? "Close Gaia" : "Open Gaia"}
      whileHover={freezeMotion ? undefined : { scale: 1.06, y: -2 }}
      whileTap={freezeMotion ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      {...rest}
    >
      <span className="gaia-orb__halo" aria-hidden />
      <span className="gaia-orb__ring gaia-orb__ring--outer" aria-hidden />
      <span className="gaia-orb__ring gaia-orb__ring--mid" aria-hidden />
      <span className="gaia-orb__blob gaia-orb__blob--a" aria-hidden />
      <span className="gaia-orb__blob gaia-orb__blob--b" aria-hidden />
      <span className="gaia-orb__core">
        <span className="gaia-orb__spark" aria-hidden />
      </span>
    </motion.button>
  );
}
