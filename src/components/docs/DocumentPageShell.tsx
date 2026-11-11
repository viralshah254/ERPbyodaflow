"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStatusBar } from "./DocumentStatusBar";
import type { DocumentStatusActor } from "@/lib/types/documents";

interface DocumentPageShellProps {
  title: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  status?: string;
  statusActor?: DocumentStatusActor | null;
  createdByName?: string | null;
  rightSlot?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}

/** Unified document view layout: header + status bar + main + optional right panel. */
export function DocumentPageShell({
  title,
  breadcrumbs,
  actions,
  status,
  statusActor,
  createdByName,
  rightSlot,
  compact = false,
  children,
}: DocumentPageShellProps) {
  return (
    <PageShell rightSlot={rightSlot}>
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        actions={actions}
        sticky
        actionsBelow
        dense
        showCommandHint={false}
        showRightPanelToggle={!!rightSlot}
      />
      {status != null && (
        <DocumentStatusBar
          status={status}
          statusActor={statusActor}
          createdByName={createdByName}
        />
      )}
      <div className={compact ? "min-w-0 flex-1 p-2 sm:p-3" : "min-w-0 flex-1 p-3 sm:p-5"}>{children}</div>
    </PageShell>
  );
}
