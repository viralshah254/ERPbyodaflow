import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { TUTORIAL_CHAPTERS } from "../src/config/tutorial";
import { TUTORIAL_REVISION, tutorialArticles, tutorialGuideHref } from "../src/lib/tutorial/knowledge";

const arg = process.argv.indexOf("--output");
const output = resolve(arg >= 0 ? process.argv[arg + 1] : "../gaia/gaia/src/gaia/knowledge_base/data/erp-tutorials.json");
const articles = tutorialArticles(TUTORIAL_CHAPTERS).map((article) => ({ id: `${article.chapterId}:${article.key}`, title: article.label, module: article.chapterTitle, route: article.href, guide: tutorialGuideHref(article), summary: article.guideSummary ?? "", steps: article.guideSteps ?? [], tips: article.guideTips ?? [] }));
if (articles.some((article) => !article.summary || !article.steps.length)) throw new Error("Every tutorial needs a summary and written steps before export.");
const content = JSON.stringify({ revision: TUTORIAL_REVISION, kind: "workflow-guidance-not-live-data", articles }, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== content) throw new Error("Gaia handbook is stale. Re-export it from the ERP tutorial source.");
} else { mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, content); }
console.log(JSON.stringify({ output, revision: TUTORIAL_REVISION, articles: articles.length, checked: process.argv.includes("--check") }));
