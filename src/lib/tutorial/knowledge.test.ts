import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { SETTINGS_HUB_GROUPS } from "@/lib/settings/settings-hub-links";
import { searchTutorialArticles, tutorialArticles, tutorialGuideHref, tutorialReferenceBlock } from "./knowledge";
import { selectTutorialGuides } from "./gaia-guidance";

const articles = tutorialArticles(TUTORIAL_CHAPTERS);
describe("ERP handbook coverage and source links", () => {
  it("gives every navigation and settings entry written instructions and a unique guide address", () => {
    expect(articles.length).toBeGreaterThanOrEqual(267);
    expect(new Set(articles.map(tutorialGuideHref)).size).toBe(articles.length);
    for (const article of articles) { expect(article.guideSummary, article.key).toBeTruthy(); expect(article.guideSteps?.length, article.key).toBeGreaterThan(0); }
    for (const link of SETTINGS_HUB_GROUPS.flatMap((group) => group.links)) expect(articles.some((article) => article.href === link.href), link.href).toBe(true);
  });
  it("links every primary screen to a real Next page", () => {
    const root = resolve("src/app");
    const patterns = (readdirSync(root, { recursive: true }) as string[]).filter((file) => file.endsWith("/page.tsx")).map((file) => {
      const parts = file.split("/").slice(0, -1).filter((part) => !part.startsWith("("));
      return new RegExp(`^/${parts.map((part) => part.startsWith("[") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("/")}$`);
    });
    expect(existsSync(root)).toBe(true);
    for (const article of articles) expect(patterns.some((pattern) => pattern.test(article.href)), article.href).toBe(true);
  });
  it("provides contextual written help for every non-developer static ERP screen", async () => {
    const { getTutorialForRoute } = await import("@/config/tutorial");
    const root = resolve("src/app/(dashboard)");
    const routes = (readdirSync(root, { recursive: true }) as string[]).filter((file) => file.endsWith("/page.tsx") && !file.includes("[") && !file.startsWith("dev/")).map((file) => `/${file.replace(/\/page.tsx$/, "")}`).filter((route) => route !== "/dev");
    for (const route of routes) expect(getTutorialForRoute(route)?.guideSteps.length, route).toBeGreaterThan(0);
  });
  it.each([
    ["How do I print a customer statement?", "/ar/statements"],
    ["supplier statement", "/ap/statements"],
    ["where GRN", "/inventory/receipts"],
    ["production plan", "/manufacturing/production-plan"],
    ["stock count", "/warehouse/cycle-counts"],
    ["credit note", "/docs/credit-note"],
    ["who can edit items roles", "/settings/users-roles"],
  ])("finds %s", (query, route) => {
    expect(searchTutorialArticles(articles, query, 10).map((article) => article.href)).toContain(route);
  });
  it("finds a nested instruction rather than only matching module names", () => {
    expect(searchTutorialArticles(articles, "manually recorded weight", 10).some((article) => article.href.startsWith("/manufacturing/"))).toBe(true);
    expect(searchTutorialArticles(articles, "qzxvzznovalidtopic")).toEqual([]);
  });
  it("limits Gaia to provided role-filtered guides and binds explicit questions to that exact guide", () => {
    const production = articles.find((article) => article.key === "manufacturing-production-plan")!;
    const customers = articles.filter((article) => article.href === "/ar/statements");
    expect(selectTutorialGuides("Explain production", customers, { tutorialGuide: tutorialGuideHref(production) })).toEqual([]);
    expect(selectTutorialGuides("Explain this page", [production], { route: "/manufacturing/production-plan" })).toEqual([production]);
    expect(selectTutorialGuides("Explain this page", [production], { route: tutorialGuideHref(production) })).toEqual([production]);
    expect(selectTutorialGuides("What is my current stock balance?", articles)).toEqual([]);
    const reference = tutorialReferenceBlock([production]);
    expect(reference).toContain("QC hold"); expect(reference).toContain(tutorialGuideHref(production)); expect(reference).toContain("not evidence");
  });
});
