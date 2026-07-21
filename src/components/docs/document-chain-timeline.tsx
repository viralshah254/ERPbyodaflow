"use client";

import Link from "next/link";
import type { DocumentChainNode } from "@/lib/types/documents";
import { formatMoney } from "@/lib/money";
import { DocumentNumber } from "@/components/docs/document-number";
import { cn } from "@/lib/utils";
import { ArrowRight, GitBranch } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground ring-muted-foreground/20",
  PENDING_APPROVAL: "bg-amber-500/10 text-amber-800 ring-amber-500/30 dark:text-amber-200",
  APPROVED: "bg-blue-500/10 text-blue-800 ring-blue-500/30 dark:text-blue-200",
  POSTED: "bg-emerald-500/10 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200",
  CONVERTED: "bg-violet-500/10 text-violet-800 ring-violet-500/30 dark:text-violet-200",
  CANCELLED: "bg-red-500/10 text-red-700 ring-red-500/30",
};

function typeLabel(typeKey: string) {
  return typeKey.replace(/-/g, " ");
}

function ChainStep({
  href,
  number,
  typeKey,
  status,
  total,
  currency,
  exchangeRate,
  highlight,
  label,
}: {
  href?: string;
  number: string;
  typeKey: string;
  status: string;
  total?: number;
  currency: string;
  exchangeRate?: number;
  highlight?: boolean;
  label?: string;
}) {
  const statusClass = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const content = (
    <div
      className={cn(
        "relative flex min-w-[140px] max-w-[180px] flex-col gap-1.5 rounded-xl border px-4 py-3 shadow-sm transition-all",
        highlight
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
      )}
    >
      {label ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{label}</span>
      ) : null}
      <DocumentNumber value={number} className="text-sm font-semibold" />
      <span className="text-[11px] capitalize text-muted-foreground">{typeLabel(typeKey)}</span>
      <span
        className={cn(
          "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset",
          statusClass
        )}
      >
        {status.replace(/_/g, " ")}
      </span>
      {total != null ? (
        <span className="text-xs font-medium tabular-nums text-foreground/90">
          {formatMoney(total, currency, { decimals: total % 1 === 0 ? 0 : 2 })}
        </span>
      ) : null}
    </div>
  );

  if (href && !highlight) {
    return (
      <Link href={href} className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        {content}
      </Link>
    );
  }
  return <div className="shrink-0">{content}</div>;
}

function flattenChain(nodes: DocumentChainNode[]): DocumentChainNode[] {
  const out: DocumentChainNode[] = [];
  const walk = (list: DocumentChainNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function DocumentChainTimeline({
  sourceDocument,
  documentChain,
  currentDoc,
  currency,
  exchangeRate,
}: {
  sourceDocument?: {
    id: string;
    typeKey: string;
    number: string;
    status: string;
    total?: number;
  } | null;
  documentChain: DocumentChainNode[];
  currentDoc: { id: string; typeKey: string; number: string; status: string; total?: number };
  currency: string;
  exchangeRate?: number;
}) {
  const downstream = flattenChain(documentChain);
  const steps: Array<{
    key: string;
    href?: string;
    number: string;
    typeKey: string;
    status: string;
    total?: number;
    highlight?: boolean;
    label?: string;
  }> = [];

  if (sourceDocument) {
    steps.push({
      key: sourceDocument.id,
      href: `/docs/${sourceDocument.typeKey}/${sourceDocument.id}`,
      number: sourceDocument.number,
      typeKey: sourceDocument.typeKey,
      status: sourceDocument.status,
      total: sourceDocument.total,
    });
  }

  steps.push({
    key: currentDoc.id,
    number: currentDoc.number,
    typeKey: currentDoc.typeKey,
    status: currentDoc.status,
    total: currentDoc.total,
    highlight: true,
    label: "This document",
  });

  for (const node of downstream) {
    steps.push({
      key: node.id,
      href: `/docs/${node.typeKey}/${node.id}`,
      number: node.number,
      typeKey: node.typeKey,
      status: node.status,
      total: node.total,
    });
  }

  if (steps.length <= 1) return null;

  return (
    <section className="rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">Document flow</h2>
      </div>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {steps.map((step, index) => (
          <div key={step.key} className="flex shrink-0 items-center gap-2">
            <ChainStep
              href={step.href}
              number={step.number}
              typeKey={step.typeKey}
              status={step.status}
              total={step.total}
              currency={currency}
              exchangeRate={exchangeRate}
              highlight={step.highlight}
              label={step.label}
            />
            {index < steps.length - 1 ? (
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
