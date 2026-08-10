"use client";

import * as React from "react";

/**
 * Render Gaia chat text with clickable links.
 *
 * Supports:
 * - Markdown: [label](https://…)
 * - Tolerant: [label] (https://…)  (common LLM slip)
 * - Bare https://… URLs
 *
 * Keeps newlines; never dumps raw markdown brackets into the bubble.
 */
const LINK_RE =
  /\[([^\]]+)\]\s*\(\s*(https?:\/\/[^)\s]+)\s*\)|(https?:\/\/[^\s<>"'`)\]]+)/g;

function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function LinkAnchor({
  href,
  children,
  tone,
}: {
  href: string;
  children: React.ReactNode;
  tone: "user" | "assistant";
}) {
  const className =
    tone === "user"
      ? "font-medium underline underline-offset-2 decoration-white/70 hover:decoration-white break-words"
      : "font-medium text-[#075985] underline underline-offset-2 hover:text-[#0A73B7] dark:text-sky-300 dark:hover:text-sky-200 break-words";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function GaiaMessageBody({
  text,
  tone = "assistant",
}: {
  text: string;
  tone?: "user" | "assistant";
}) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  const src = text || "";

  for (const match of src.matchAll(LINK_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) {
      nodes.push(src.slice(last, idx));
    }
    const label = match[1];
    const mdUrl = match[2];
    const bareUrl = match[3];
    const href = mdUrl || bareUrl || "";
    if (href && isSafeHttpUrl(href)) {
      nodes.push(
        <LinkAnchor key={`l-${key++}`} href={href} tone={tone}>
          {label?.trim() || href}
        </LinkAnchor>
      );
    } else {
      nodes.push(match[0]);
    }
    last = idx + match[0].length;
  }
  if (last < src.length) {
    nodes.push(src.slice(last));
  }

  return (
    <div className="min-w-0 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
      {nodes}
    </div>
  );
}
