const POSTING_ACCOUNTS_HREF = "/settings/financial/posting-mappings";

export function postingAccountsHref(returnTo?: string): string {
  if (!returnTo) return POSTING_ACCOUNTS_HREF;
  return `${POSTING_ACCOUNTS_HREF}?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Chart account is the wrong kind for the posting role. The message already says why and where. */
export function chartAccountPostingNotice(error: unknown): { message: string; href: string } | null {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error && typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : undefined;
  const mapped = code === "POSTING_ACCOUNT" || /settings → financial → posting accounts/i.test(message) || /cannot be used for [a-z]+ postings/i.test(message);
  if (!message || !mapped) return null;
  return { message, href: POSTING_ACCOUNTS_HREF };
}

const REASON_LABELS: Record<string, string> = {
  missing_wip_account: "Work in progress",
  missing_wip_or_inventory_account: "Work in progress",
  missing_inventory_account: "Inventory",
  missing_labour_account: "Production labour",
  missing_overhead_account: "Production overhead",
};

/** Turn the production posting failure into the account name and the screen where it is set. */
export function postingAccountNotice(error: unknown): { message: string; href: string } | null {
  const message = error instanceof Error ? error.message : "";
  const reason = message.match(/missing_[a-z_]+_account/)?.[0];
  if (!reason && !/Posting accounts/.test(message)) return null;
  if (/Posting accounts/.test(message) && !reason) return { message, href: POSTING_ACCOUNTS_HREF };
  const label = reason ? REASON_LABELS[reason] : "";
  if (!label) return { message, href: POSTING_ACCOUNTS_HREF };
  return {
    message: `${label} is not set. Open Settings → Financial → Posting accounts, choose ${label}, then receive the batch again.`,
    href: POSTING_ACCOUNTS_HREF,
  };
}
