"use client";

import * as React from "react";

/**
 * Lightweight markdown for Gaia chat bubbles.
 *
 * Supported:
 * - Titles / subtitles: # ## ###
 * - **bold**, *italic*, `code`
 * - Numbered + bullet lists
 * - Blockquotes (>)
 * - Horizontal rules (---)
 * - Links: [label](url), tolerant [label] (url), bare https://…
 */
const INLINE_TOKEN_RE =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\s*\(\s*(https?:\/\/[^)\s]+)\s*\)|https?:\/\/[^\s<>"'`)\]]+)/g;
const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const QUOTE_RE = /^>\s?(.*)$/;
const LIST_ITEM_RE = /^(\d+)\.\s+(.+)$/;
const BULLET_RE = /^[-*]\s+(.+)$/;

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

function renderInline(
  text: string,
  tone: "user" | "assistant",
  keyPrefix: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let last = 0;
  const src = text || "";

  for (const match of src.matchAll(INLINE_TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) nodes.push(src.slice(last, idx));
    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (
      token.startsWith("*") &&
      token.endsWith("*") &&
      !token.startsWith("**")
    ) {
      nodes.push(
        <em key={`${keyPrefix}-${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-${key++}`}
          className={
            tone === "user"
              ? "rounded px-1 py-0.5 text-[12px] font-medium bg-white/15"
              : "rounded px-1 py-0.5 text-[12px] font-medium bg-slate-900/5 dark:bg-white/10"
          }
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const label = match[2];
      const mdUrl = match[3];
      const bare = token.startsWith("http") ? token : "";
      const href = mdUrl || bare;
      if (href && isSafeHttpUrl(href)) {
        nodes.push(
          <LinkAnchor key={`${keyPrefix}-${key++}`} href={href} tone={tone}>
            {label?.trim() || href}
          </LinkAnchor>
        );
      } else {
        nodes.push(token);
      }
    }
    last = idx + token.length;
  }
  if (last < src.length) nodes.push(src.slice(last));
  return nodes;
}

type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "ol"; items: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "hr" };

function parseBlocks(src: string): Block[] {
  const lines = (src || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let ol: string[] | null = null;
  let ul: string[] | null = null;
  let quote: string[] | null = null;

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join("\n").trimEnd();
    if (text) blocks.push({ kind: "p", text });
    para = [];
  };
  const flushList = () => {
    if (ol?.length) blocks.push({ kind: "ol", items: ol });
    if (ul?.length) blocks.push({ kind: "ul", items: ul });
    ol = null;
    ul = null;
  };
  const flushQuote = () => {
    if (quote?.length) blocks.push({ kind: "quote", lines: quote });
    quote = null;
  };
  const flushAll = () => {
    flushList();
    flushQuote();
    flushPara();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    const heading = HEADING_RE.exec(trimmed);
    const numbered = LIST_ITEM_RE.exec(trimmed);
    const bullet = BULLET_RE.exec(trimmed);
    const quoteMatch = QUOTE_RE.exec(line);

    if (HR_RE.test(trimmed)) {
      flushAll();
      blocks.push({ kind: "hr" });
      continue;
    }
    if (heading) {
      flushAll();
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ kind: "h", level, text: heading[2].trim() });
      continue;
    }
    if (quoteMatch) {
      flushList();
      flushPara();
      if (!quote) quote = [];
      quote.push(quoteMatch[1]);
      continue;
    }
    if (numbered) {
      flushPara();
      flushQuote();
      if (ul) flushList();
      if (!ol) ol = [];
      ol.push(numbered[2]);
      continue;
    }
    if (bullet) {
      flushPara();
      flushQuote();
      if (ol) flushList();
      if (!ul) ul = [];
      ul.push(bullet[1]);
      continue;
    }
    if (!trimmed) {
      flushAll();
      continue;
    }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return blocks;
}

function headingClass(level: 1 | 2 | 3, tone: "user" | "assistant"): string {
  const base = "m-0 font-semibold tracking-tight";
  if (tone === "user") {
    if (level === 1) return `${base} text-[16px] leading-snug`;
    if (level === 2) return `${base} text-[14.5px] leading-snug text-white/95`;
    return `${base} text-[13.5px] leading-snug text-white/90`;
  }
  if (level === 1) {
    return `${base} text-[16px] leading-snug text-slate-900 dark:text-slate-50`;
  }
  if (level === 2) {
    return `${base} text-[14.5px] leading-snug text-slate-800 dark:text-slate-100`;
  }
  return `${base} text-[13px] leading-snug uppercase tracking-[0.04em] text-slate-600 dark:text-slate-300`;
}

export function GaiaMessageBody({
  text,
  tone = "assistant",
}: {
  text: string;
  tone?: "user" | "assistant";
}) {
  const blocks = parseBlocks(text || "");
  const listTone =
    tone === "user"
      ? "marker:text-white/80"
      : "marker:text-slate-500 dark:marker:text-slate-400";
  const quoteTone =
    tone === "user"
      ? "border-white/40 text-white/90"
      : "border-sky-300 text-slate-600 dark:border-slate-500 dark:text-slate-300";
  const hrTone =
    tone === "user" ? "border-white/25" : "border-slate-200 dark:border-slate-600";

  return (
    <div className="min-w-0 break-words [overflow-wrap:anywhere] space-y-2.5">
      {blocks.map((block, i) => {
        if (block.kind === "h") {
          const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
          return (
            <Tag key={`h-${i}`} className={headingClass(block.level, tone)}>
              {renderInline(block.text, tone, `h${i}`)}
            </Tag>
          );
        }
        if (block.kind === "hr") {
          return <hr key={`hr-${i}`} className={`my-1 border-0 border-t ${hrTone}`} />;
        }
        if (block.kind === "quote") {
          return (
            <blockquote
              key={`q-${i}`}
              className={`m-0 border-l-2 pl-2.5 space-y-1 ${quoteTone}`}
            >
              {block.lines.map((line, j) => (
                <p key={`ql-${j}`} className="m-0 whitespace-pre-wrap text-[13px]">
                  {renderInline(line, tone, `q${i}-${j}`)}
                </p>
              ))}
            </blockquote>
          );
        }
        if (block.kind === "p") {
          return (
            <p key={`p-${i}`} className="m-0 whitespace-pre-wrap">
              {renderInline(block.text, tone, `p${i}`)}
            </p>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol
              key={`ol-${i}`}
              className={`m-0 list-decimal pl-5 space-y-1 ${listTone}`}
            >
              {block.items.map((item, j) => (
                <li key={`oli-${j}`} className="pl-0.5">
                  {renderInline(item, tone, `ol${i}-${j}`)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <ul
            key={`ul-${i}`}
            className={`m-0 list-disc pl-5 space-y-1 ${listTone}`}
          >
            {block.items.map((item, j) => (
              <li key={`uli-${j}`} className="pl-0.5">
                {renderInline(item, tone, `ul${i}-${j}`)}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
