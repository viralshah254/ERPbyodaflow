"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import type { FiscalPostingPreflight } from "@/lib/api/documents";

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-xl">
          <div className="space-y-2">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Icons.Landmark className="h-5 w-5 text-amber-600" />
              Posting accounts needed before {signAndPost ? "sign and post" : "posting"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground leading-relaxed">
              KRA signing runs only after your chart is wired for this invoice. Map each role below in{" "}
              <span className="font-medium text-foreground">Settings → Financial → Posting accounts</span>, save, then
              return here to continue. No signing request is sent until this is complete.
            </Dialog.Description>
          </div>

          {issues.length ? (
            <ul className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              {issues.map((issue) => (
                <li
                  key={issue.key}
                  className="flex gap-2 rounded-md border border-amber-300/50 bg-amber-50/80 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/30"
                >
                  <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-foreground">{issue.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{issue.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Not now
            </Button>
            <Button type="button" variant="secondary" asChild>
              <Link href={settingsHref}>
                <Icons.Settings className="mr-2 h-4 w-4" />
                Open posting accounts
              </Link>
            </Button>
            <Button type="button" disabled={retrying} onClick={() => void onRetry()}>
              {retrying ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Icons.RefreshCw className="mr-2 h-4 w-4" />
                  I&apos;ve fixed this — try again
                </>
              )}
            </Button>
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