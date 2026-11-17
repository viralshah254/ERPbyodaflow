"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import type { FiscalPostingIssue, FiscalPostingPreflight } from "@/lib/api/documents";

const POSTING_KEY_LABELS: Record<string, string> = {
  accountsReceivableAccountId: "Accounts receivable",
  salesRevenueAccountId: "Sales revenue",
  outputVatAccountId: "Output VAT",
  inventoryAccountId: "Inventory",
  cogsAccountId: "Cost of goods sold",
  accountsPayableAccountId: "Accounts payable",
  purchaseExpenseAccountId: "Purchase expense",
  inputVatAccountId: "Input VAT",
};

/** Turn the fiscal-signing error into a short list of account roles. */
export function preflightFromPostingError(message: string): FiscalPostingPreflight | null {
  if (!/posting accounts/i.test(message) || !/fiscal signing/i.test(message)) return null;
  const listed = message.match(/before fiscal signing:\s*([^.]+)/i)?.[1] ?? "";
  const keys = listed.split(",").map((key) => key.trim()).filter(Boolean);
  const issues: FiscalPostingIssue[] = (keys.length ? keys : ["accountsReceivableAccountId"]).map((key) => ({
    key,
    label: POSTING_KEY_LABELS[key] ?? key.replace(/AccountId$/, "").replace(/([A-Z])/g, " $1").trim(),
    reason: "missing_mapping",
    message: "Choose an account for this role, then save.",
  }));
  return {
    applies: true,
    ready: false,
    issues,
    settingsPath: "/settings/financial/posting-mappings",
  };
}

export function FiscalPostingPreflightDialog({
  open,
  onOpenChange,
  preflight,
  returnTo,
  onRetry,
  retrying = false,
  signAndPost = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preflight: FiscalPostingPreflight | null;
  returnTo: string;
  onRetry: () => void;
  retrying?: boolean;
  signAndPost?: boolean;
}) {
  const settingsHref = `${preflight?.settingsPath ?? "/settings/financial/posting-mappings"}?returnTo=${encodeURIComponent(returnTo)}`;
  const issues = preflight?.issues ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] flex max-h-[min(36rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-xl [&>[data-contextual-dialog-help]]:w-full [&>[data-contextual-dialog-help]]:shrink-0 [&>[data-contextual-dialog-help]]:border-b [&>[data-contextual-dialog-help]]:bg-card [&>[data-contextual-dialog-help]]:px-4 [&>[data-contextual-dialog-help]]:py-2">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            <div className="space-y-2">
              <Dialog.Title className="text-lg font-semibold leading-snug">
                Set posting accounts before {signAndPost ? "sign and post" : "posting"}
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                This invoice was not sent to KRA. Open{" "}
                <span className="font-medium text-foreground">Settings → Financial → Posting accounts</span>, choose an
                account for each item below, save, then come back and sign and post again.
              </Dialog.Description>
            </div>

            {issues.length ? (
              <ul className="space-y-1.5 text-sm">
                {issues.map((issue) => (
                  <li key={issue.key} className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                    <Icons.Circle className="h-2 w-2 shrink-0 fill-amber-500 text-amber-500" />
                    <span className="font-medium">{issue.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" variant="outline" disabled={retrying} onClick={() => void onRetry()}>
                {retrying ? "Checking…" : "Try sign and post again"}
              </Button>
              <Button type="button" asChild>
                <Link href={settingsHref}>Go to posting accounts</Link>
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Inline heads-up when posting accounts block sign-and-post. */
export function FiscalPostingPreflightBanner({
  preflight,
  returnTo,
  onOpenDetails,
}: {
  preflight: FiscalPostingPreflight;
  returnTo: string;
  onOpenDetails: () => void;
}) {
  if (!preflight.applies || preflight.ready) return null;
  const count = preflight.issues.length;
  const settingsHref = `${preflight.settingsPath}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-50">
      <p className="font-medium flex items-start gap-2 leading-snug">
        <Icons.AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {count === 1
            ? "One posting account must be mapped before sign and post."
            : `${count} posting accounts must be mapped before sign and post.`}{" "}
          <button type="button" className="underline font-medium" onClick={onOpenDetails}>
            See what&apos;s missing
          </button>
          {" · "}
          <Link href={settingsHref} className="underline font-medium">
            Fix in settings
          </Link>
        </span>
      </p>
    </div>
  );
}