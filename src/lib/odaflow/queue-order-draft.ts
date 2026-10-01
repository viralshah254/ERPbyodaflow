export type QueueDraftOption = {
  id: string;
  label: string;
  description?: string;
};

export type QueueDraftExtraLine = {
  key: string;
  qty: number;
  product: QueueDraftOption | null;
};

export type OdaflowQueueOrderDraft = {
  customer: QueueDraftOption | null;
  lineProducts: Record<string, QueueDraftOption>;
  lineQty: Record<string, number>;
  deliveryAddress: string;
  extraLines: QueueDraftExtraLine[];
  replacedProductLines: Record<string, string>;
};

function draftKey(queueId: string): string {
  return `erp:odaflow-queue-draft:${queueId}`;
}

function isOption(value: unknown): value is QueueDraftOption {
  if (!value || typeof value !== "object") return false;
  const option = value as QueueDraftOption;
  return typeof option.id === "string" && option.id.length > 0 && typeof option.label === "string";
}

export function readOdaflowQueueOrderDraft(queueId: string): OdaflowQueueOrderDraft | null {
  if (typeof window === "undefined" || !queueId) return null;
  try {
    const raw = window.localStorage.getItem(draftKey(queueId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OdaflowQueueOrderDraft>;
    const lineProducts: Record<string, QueueDraftOption> = {};
    for (const [index, option] of Object.entries(parsed.lineProducts ?? {})) {
      if (isOption(option)) lineProducts[index] = option;
    }
    const lineQty: Record<string, number> = {};
    for (const [index, qty] of Object.entries(parsed.lineQty ?? {})) {
      if (typeof qty === "number" && qty > 0) lineQty[index] = qty;
    }
    const extraLines = Array.isArray(parsed.extraLines)
      ? parsed.extraLines.flatMap((line) => {
          if (!line || typeof line !== "object") return [];
          const row = line as QueueDraftExtraLine;
          if (typeof row.key !== "string" || !row.key) return [];
          const qty = typeof row.qty === "number" && row.qty > 0 ? row.qty : 1;
          return [{ key: row.key, qty, product: isOption(row.product) ? row.product : null }];
        })
      : [];
    const replacedProductLines: Record<string, string> = {};
    for (const [index, productId] of Object.entries(parsed.replacedProductLines ?? {})) {
      if (typeof productId === "string" && productId) replacedProductLines[index] = productId;
    }
    return {
      customer: isOption(parsed.customer) ? parsed.customer : null,
      lineProducts,
      lineQty,
      deliveryAddress: typeof parsed.deliveryAddress === "string" ? parsed.deliveryAddress : "",
      extraLines,
      replacedProductLines,
    };
  } catch {
    return null;
  }
}

export function writeOdaflowQueueOrderDraft(queueId: string, draft: OdaflowQueueOrderDraft): void {
  if (typeof window === "undefined" || !queueId) return;
  window.localStorage.setItem(draftKey(queueId), JSON.stringify(draft));
}

export function clearOdaflowQueueOrderDraft(queueId: string): void {
  if (typeof window === "undefined" || !queueId) return;
  window.localStorage.removeItem(draftKey(queueId));
}
