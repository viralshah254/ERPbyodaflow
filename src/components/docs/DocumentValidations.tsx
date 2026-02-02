"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentValidationsProps {
  items: { ok: boolean; message: string }[];
}

/** Validation results block for document right panel. */
export function DocumentValidations({ items }: DocumentValidationsProps) {
  if (items.length === 0) {
    return (
      <div>
        <p className="font-medium text-sm mb-1">Validations</p>
        <p className="text-muted-foreground text-sm">All validations passed.</p>
      </div>
    );
  }

  const failed = items.filter((x) => !x.ok);

  return (
    <div>
      <p className="font-medium text-sm mb-2">Validations</p>
      <ul className="space-y-1.5">
        {items.map((v, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            {v.ok ? (
              <Icons.CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <Icons.AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <span className={cn(!v.ok && "text-destructive")}>{v.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
