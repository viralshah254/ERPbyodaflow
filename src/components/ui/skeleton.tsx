import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Matches selectable DataTable layout (checkbox + columns + trailing actions). */
export function SkeletonDataTable({
  rows = 10,
  columnWidths = ["w-24", "w-20", "w-36", "w-28", "w-24", "w-8"],
}: {
  rows?: number;
  columnWidths?: string[];
}) {
  return (
    <div className="rounded-md border bg-card">
      <div className="space-y-0 p-1">
        <div className="flex items-center gap-4 border-b px-3 py-3">
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          {columnWidths.map((width, i) => (
            <Skeleton key={`h-${i}`} className={cn("h-4 shrink-0", width)} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 border-b px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
            {columnWidths.map((width, colIndex) => (
              <Skeleton key={`${rowIndex}-${colIndex}`} className={cn("h-4 shrink-0", width)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}





