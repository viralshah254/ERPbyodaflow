"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogSyncPending } from "@/lib/api/odaflow-integration";

type Props = {
  pending: CatalogSyncPending | null | undefined;
  /** Opens the local product sync sheet when provided. */
  onSyncHere?: () => void;
};

export function SfaCatalogSyncAlertBanner({ pending, onSyncHere }: Props) {
  if (!pending || pending.count < 1) return null;
  const countLabel =
    pending.count === 1 ? "1 catalog change" : `${pending.count} catalog changes`;
  const detail = pending.label ? ` Latest: ${pending.label}.` : "";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-foreground">SFA catalog is behind</p>
        <p className="text-xs text-muted-foreground">
          {countLabel} since the last sync.{detail} Sync from here, or use Sync from ERP on SFA
          Products.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onSyncHere ? (
          <Button type="button" size="sm" onClick={onSyncHere}>
            <Icons.Radio className="mr-2 h-4 w-4" />
            Sync to SFA
          </Button>
        ) : (
          <Button type="button" size="sm" asChild>
            <Link href="/settings/integrations/odaflow?tab=products">
              <Icons.Radio className="mr-2 h-4 w-4" />
              Open product sync
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
