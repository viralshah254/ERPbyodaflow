"use client";

import { cn } from "@/lib/utils";

/** Indeterminate bar shown along the top edge of a table while data is refetching. */
export function TableLinearProgress({ active, className }: { active: boolean; className?: string }) {
  if (!active) return null;
  return (
    <div
      className={cn("absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-t-md", className)}
      role="progressbar"
      aria-label="Loading"
    >
      <div className="table-linear-progress-bar h-full w-1/3 bg-primary" />
      <style>{`
        @keyframes table-linear-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .table-linear-progress-bar {
          animation: table-linear-progress 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
