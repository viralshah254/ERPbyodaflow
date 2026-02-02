import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function SectionCard({
  children,
  className,
  padding = "md",
}: SectionCardProps) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card",
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}





