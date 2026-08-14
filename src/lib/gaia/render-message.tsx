"use client";

import * as React from "react";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

/**
 * Gaia chat markdown → safe HTML.
 * Headings, lists, bold/italic/code, links, quotes, rules.
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

const PURIFY = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "strong",
    "em",
    "i",
    "p",
    "br",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "code",
    "pre",
    "hr",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOW_DATA_ATTR: false,
};

function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeMarkdown(text: string): string {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\uFF03/g, "#")
    .trim();
}

function toSafeHtml(text: string): string {
  const md = normalizeMarkdown(text);
  if (!md) return "";
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, PURIFY).replace(
    /<a /g,
    '<a target="_blank" rel="noopener noreferrer" '
  );
}

function scrubUnsafeHrefs(html: string): string {
  return html.replace(
    /href=("|\')([^"']*)\1/gi,
    (full, quote: string, href: string) => {
      if (isSafeHttpUrl(href)) return full;
      return `href=${quote}#${quote}`;
    }
  );
}

function shellClass(tone: "user" | "assistant"): string {
  if (tone === "user") {
    return [
      "gaia-md min-w-0 break-words [overflow-wrap:anywhere]",
      "[&_h1]:text-[16px] [&_h1]:font-semibold [&_h1]:m-0 [&_h1]:mb-1.5 [&_h1]:leading-snug",
      "[&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:m-0 [&_h2]:mb-1.5 [&_h2]:leading-snug",
      "[&_h3]:text-[12.5px] [&_h3]:font-semibold [&_h3]:m-0 [&_h3]:mb-1 [&_h3]:mt-2",
      "[&_h3]:uppercase [&_h3]:tracking-[0.04em] [&_h3]:text-white/90",
      "[&_h4]:text-[13px] [&_h4]:font-semibold [&_h4]:m-0 [&_h4]:mb-1",
      "[&_p]:m-0 [&_p]:mb-2 [&_p]:leading-relaxed last:[&_p]:mb-0",
      "[&_ul]:m-0 [&_ul]:mb-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1",
      "[&_ol]:m-0 [&_ol]:mb-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1",
      "[&_li]:leading-relaxed",
      "[&_strong]:font-semibold",
      "[&_em]:italic [&_em]:text-white/90",
      "[&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:bg-white/15",
      "[&_blockquote]:m-0 [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-white/40",
      "[&_blockquote]:pl-2.5 [&_blockquote]:text-white/90",
      "[&_hr]:my-2 [&_hr]:border-white/25",
      "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
    ].join(" ");
  }
  return [
    "gaia-md min-w-0 break-words [overflow-wrap:anywhere]",
    "[&_h1]:text-[16px] [&_h1]:font-semibold [&_h1]:m-0 [&_h1]:mb-1.5 [&_h1]:leading-snug",
    "[&_h1]:text-slate-900 dark:[&_h1]:text-slate-50",
    "[&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:m-0 [&_h2]:mb-1.5 [&_h2]:leading-snug",
    "[&_h2]:text-slate-900 dark:[&_h2]:text-slate-50",
    "[&_h3]:text-[12.5px] [&_h3]:font-semibold [&_h3]:m-0 [&_h3]:mb-1 [&_h3]:mt-2",
    "[&_h3]:uppercase [&_h3]:tracking-[0.04em]",
    "[&_h3]:text-slate-600 dark:[&_h3]:text-slate-300",
    "[&_h4]:text-[13px] [&_h4]:font-semibold [&_h4]:m-0 [&_h4]:mb-1",
    "[&_p]:m-0 [&_p]:mb-2 [&_p]:leading-relaxed last:[&_p]:mb-0",
    "[&_ul]:m-0 [&_ul]:mb-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1",
    "[&_ol]:m-0 [&_ol]:mb-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1",
    "[&_li]:leading-relaxed",
    "[&_strong]:font-semibold",
    "[&_em]:italic [&_em]:text-slate-600 dark:[&_em]:text-slate-300",
    "[&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]",
    "[&_code]:bg-slate-900/5 dark:[&_code]:bg-white/10",
    "[&_blockquote]:m-0 [&_blockquote]:mb-2 [&_blockquote]:border-l-2",
    "[&_blockquote]:border-sky-300 dark:[&_blockquote]:border-slate-500",
    "[&_blockquote]:pl-2.5 [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-300",
    "[&_hr]:my-2 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-600",
    "[&_a]:font-medium [&_a]:text-[#075985] [&_a]:underline [&_a]:underline-offset-2",
    "dark:[&_a]:text-sky-300",
  ].join(" ");
}

export function GaiaMessageBody({
  text,
  tone = "assistant",
}: {
  text: string;
  tone?: "user" | "assistant";
}) {
  const html = React.useMemo(
    () => scrubUnsafeHrefs(toSafeHtml(text)),
    [text]
  );

  if (!html) {
    return <div className="min-w-0" />;
  }

  return (
    <div
      className={shellClass(tone)}
      data-gaia-md="1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
