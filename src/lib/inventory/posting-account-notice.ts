const POSTING_ACCOUNTS_HREF = "/settings/financial/posting-mappings";

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
