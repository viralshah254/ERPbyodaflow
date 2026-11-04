import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { getAccessibleTutorialChapters } from "./filter-by-access";
import { searchTutorialArticles, tutorialArticles, tutorialGuideHref, tutorialReferenceBlock, tutorialAnswer, type TutorialArticle } from "./knowledge";

export type TutorialQuestionContext = { tutorialGuide?: string; route?: string };
export function selectTutorialGuides(message: string, articles: TutorialArticle[], context: TutorialQuestionContext = {}): TutorialArticle[] {
  if (context.tutorialGuide) return articles.filter((article) => tutorialGuideHref(article) === context.tutorialGuide).slice(0, 1);
  if (!/\b(how|where|explain|tutorial|guide|walk|teach|help|steps|workflow)\b/i.test(message)) return [];
  if (/\b(this page|this screen|here)\b/i.test(message) && context.route) {
    const matches = articles.filter((article) => context.route === tutorialGuideHref(article) || context.route === article.href || context.route!.startsWith(`${article.href}/`));
    return matches.sort((a, b) => b.href.length - a.href.length).slice(0, 1);
  }
  return searchTutorialArticles(articles, message, 3);
}

export function getTutorialGuidance(message: string, context: TutorialQuestionContext = {}) {
  const articles = selectTutorialGuides(message, tutorialArticles(getAccessibleTutorialChapters(TUTORIAL_CHAPTERS)), context);
  return {
    articles,
    providerMessage: articles.length ? `${message}\n\n${tutorialReferenceBlock(articles)}` : message,
    fallback: articles.length ? `Gaia’s AI service is unavailable. Here are the saved ERP handbook instructions:\n\n${tutorialAnswer(articles[0])}${articles.length > 1 ? `\n\nRelated guides\n${articles.slice(1).map((article) => `- [${article.label}](${tutorialGuideHref(article)})`).join("\n")}` : ""}` : null,
  };
}
