"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ODA_BRAND } from "@/lib/brand";
import { OdaLogo } from "./OdaLogo";

type AppSplashScreenProps = {
  message?: string;
  /** Full viewport (auth restore) vs shorter block (route loading). */
  variant?: "fullscreen" | "embedded";
};

export function AppSplashScreen({
  message = "Loading…",
  variant = "fullscreen",
}: AppSplashScreenProps) {
  const isFull = variant === "fullscreen";

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-6 px-6",
        isFull ? "flex h-full min-h-0 w-full flex-1 flex-col" : "min-h-[220px] py-16"
      )}
      style={{ backgroundColor: "#ffffff" }}
    >
      <OdaLogo height={isFull ? 72 : 56} className="max-w-[min(90vw,340px)]" />
      {message ? (
        <p className="max-w-sm text-center text-sm text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}
