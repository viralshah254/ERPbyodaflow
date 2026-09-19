export type CollectionsHold = {
  enabled: true;
  canViewBalance: boolean;
  message: string;
  currency?: string;
  principal?: number;
  interestAccrued?: number;
  totalDue?: number;
  monthlyRate?: number;
  interestStart?: string;
  asOf?: string;
  outstandingHeadline?: string;
  interestNote?: string;
  contractNote?: string;
};

export function parseCollectionsHold(raw: unknown): CollectionsHold | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Record<string, unknown>;
  if (h.enabled !== true) return null;
  return {
    enabled: true,
    canViewBalance: h.canViewBalance === true,
    message: typeof h.message === "string" ? h.message : "Access to the ERP is suspended. Contact HQ.",
    currency: typeof h.currency === "string" ? h.currency : undefined,
    principal: typeof h.principal === "number" ? h.principal : undefined,
    interestAccrued: typeof h.interestAccrued === "number" ? h.interestAccrued : undefined,
    totalDue: typeof h.totalDue === "number" ? h.totalDue : undefined,
    monthlyRate: typeof h.monthlyRate === "number" ? h.monthlyRate : undefined,
    interestStart: typeof h.interestStart === "string" ? h.interestStart : undefined,
    asOf: typeof h.asOf === "string" ? h.asOf : undefined,
    outstandingHeadline: typeof h.outstandingHeadline === "string" ? h.outstandingHeadline : undefined,
    interestNote: typeof h.interestNote === "string" ? h.interestNote : undefined,
    contractNote: typeof h.contractNote === "string" ? h.contractNote : undefined,
  };
}

export function formatKes(amount: number): string {
  return `Ksh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
