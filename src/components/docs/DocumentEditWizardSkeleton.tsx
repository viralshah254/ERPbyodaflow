"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Shell shown while the edit page fetches document core data — keeps layout stable without a blank full-page spinner. */
export function DocumentEditWizardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading document editor">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-1.5 min-w-0 flex-1 rounded-full" />
          <Skeleton className="h-4 w-28 shrink-0" />
        </div>
        <div className="flex items-start justify-between gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1 py-1 sm:px-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="hidden h-3 w-16 sm:block" />
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Skeleton className="h-10 w-24 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
