"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GradientBlobProps {
  className?: string;
  variant?: "primary" | "secondary" | "accent";
}

export function GradientBlob({ className, variant = "primary" }: GradientBlobProps) {
  const variants = {
    primary: "from-primary/20 via-primary/10 to-transparent dark:from-primary/30 dark:via-primary/15",
    secondary: "from-secondary/20 via-secondary/10 to-transparent dark:from-secondary/30 dark:via-secondary/15",
    accent: "from-accent/20 via-accent/10 to-transparent dark:from-accent/30 dark:via-accent/15",
  };

  return (
    <div
      className={cn(
        "absolute inset-0 -z-10 bg-gradient-to-br",
        variants[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}

