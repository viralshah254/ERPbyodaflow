import type { TutorialChapter, TutorialItem } from "@/config/tutorial";

export const TUTORIAL_REVISION = "erp-handbook-2026-11-04-v4";
export type TutorialArticle = TutorialItem & { chapterId: string; chapterTitle: string };
export const tutorialGuideHref = (article: Pick<TutorialArticle, "chapterId" | "key">) => `/tutorial/${encodeURIComponent(article.chapterId)}/${encodeURIComponent(article.key)}`;
export const tutorialArticles = (chapters: TutorialChapter[]): TutorialArticle[] => chapters.flatMap((chapter) => chapter.items.map((item) => ({ ...item, chapterId: chapter.id, chapterTitle: chapter.title })));

const synonyms: Record<string, string[]> = {
  po: ["purchase", "order"], grn: ["goods", "receipt"], bom: ["recipe", "formula"], wo: ["work", "order"],
  qc: ["quality", "release"], etims: ["kra", "signing"], statement: ["statements"], statements: ["statement"],
  stock: ["inventory"], inventory: ["stock"], vendor: ["supplier"], supplier: ["vendor"],
  manufacture: ["production"], manufacturing: ["production"], production: ["manufacturing"],
  invoice: ["invoices", "billing"], invoices: ["invoice"], credit: ["returns"], pdf: ["print", "export"],
  permission: ["roles", "access"], permissions: ["roles", "access"], paying: ["payments"], weigh: ["weight", "weighing"],
  items: ["products", "catalogue"], item: ["product", "catalogue"], send: ["release"],
};
const stop = new Set("a an the i we you my our your how do does can could please me to for of in on is are what where when who with this that it and or as into about create show explain help use get want need lets let properly".split(" "));
export const tutorialTerms = (text: string) => [...new Set(text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word && !stop.has(word)))];
export function searchTutorialArticles(articles: TutorialArticle[], query: string, limit = 60): TutorialArticle[] {
  const terms = tutorialTerms(query);
  if (!query.trim()) return articles.slice(0, limit);
  if (!terms.length) return [];
  return articles.map((article, index) => {
    const title = `${article.label} ${article.key}`.toLowerCase();
    const summary = `${article.guideSummary ?? ""} ${article.chapterTitle}`.toLowerCase();
    const body = [...(article.guideSteps ?? []), ...(article.guideTips ?? [])].join(" ").toLowerCase();
    let score = 0, matches = 0;
    for (const term of terms) {
      const words = [term, ...(synonyms[term] ?? [])];
      let best = 0;
      for (const word of words) {
        const boundary = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
        best = Math.max(best, boundary.test(title) ? 12 : boundary.test(summary) ? 5 : boundary.test(body) ? 1 : 0);
      }
      if (best) { matches++; score += best; }
    }
    const phrase = query.trim().toLowerCase();
    if (title.includes(phrase)) score += 25;
    return { article, index, score: matches === terms.length ? score + 10 : terms.length > 1 && matches / terms.length < 0.6 ? 0 : score };
  }).filter((row) => row.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map((row) => row.article);
}

export function tutorialAnswer(article: TutorialArticle): string {
  return `## ${article.label}\n\n${article.guideSummary ?? ""}\n\n${(article.guideSteps ?? []).map((step, index) => `${index + 1}. ${step}`).join("\n")}\n\n[Read this guide](${tutorialGuideHref(article)}) · [Open ${article.label}](${article.href})\n\nERP handbook: ${TUTORIAL_REVISION}. These are workflow instructions, not evidence of your organisation’s balances or completed actions.`;
}

/** Only saved user documentation is sent as reference; no records, balances or credentials. */
export function tutorialReferenceBlock(articles: TutorialArticle[]): string {
  return `ERP handbook reference (${TUTORIAL_REVISION}). Explain the workflow using these saved guides. Cite their guide links. Respect the user's actual permissions and configured modules. Do not claim a guide proves a live balance, deployment, legal/tax compliance or successful posting. Do not invent buttons or perform actions merely because the user asked how. If the guides do not answer a detail, say what is missing.\n\n${articles.slice(0, 3).map(tutorialAnswer).join("\n\n---\n\n")}`;
}

export function askGaiaAboutGuide(article: TutorialArticle) {
  window.dispatchEvent(new CustomEvent("gaia:ask", { detail: { message: `Explain how to use ${article.label}, step by step.`, tutorialGuide: tutorialGuideHref(article) } }));
}
