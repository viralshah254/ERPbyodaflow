import { afterEach, describe, expect, it } from "vitest";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { getAccessibleTutorialChapters } from "./filter-by-access";
import { tutorialArticles } from "./knowledge";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
const authBefore = useAuthStore.getState();
const orgBefore = useOrgContextStore.getState();
afterEach(() => { useAuthStore.setState(authBefore, true); useOrgContextStore.setState(orgBefore, true); });
describe("handbook scope follows ERP access", () => {
  it("does not expose permission-gated finance or settings guides when permissions are empty", () => {
    useOrgContextStore.getState().hydrateFromBackend({ templateId: "bakex", orgType: "MANUFACTURER" });
    useAuthStore.setState({ permissions: [], isPlatformOperator: false });
    const articles = tutorialArticles(getAccessibleTutorialChapters(TUTORIAL_CHAPTERS));
    expect(articles.some((article) => article.href === "/settings/users-roles")).toBe(false);
    expect(articles.some((article) => article.href === "/ar/statements")).toBe(false);
    expect(articles.some((article) => article.href === "/finance/reporting-policy")).toBe(false);
  });
  it("keeps platform and other-template articles out of customer-admin scope", () => {
    useOrgContextStore.getState().hydrateFromBackend({ templateId: "bakex", orgType: "MANUFACTURER" });
    useAuthStore.setState({ permissions: ["*"], isPlatformOperator: false });
    const articles = tutorialArticles(getAccessibleTutorialChapters(TUTORIAL_CHAPTERS));
    expect(articles.some((article) => article.href === "/manufacturing/production-plan")).toBe(true);
    expect(articles.some((article) => article.href === "/settings/fmcg-setup")).toBe(true);
    expect(articles.some((article) => article.href === "/settings/platform")).toBe(false);
    expect(articles.some((article) => article.href === "/purchasing/coolcatch-sourcing")).toBe(false);
    expect(articles.some((article) => article.href === "/settings/users-roles")).toBe(true);
  });
  it("does not link disabled manufacturing modules or restricted next steps", () => {
    useOrgContextStore.getState().hydrateFromBackend({ templateId: "bakex", orgType: "MANUFACTURER" });
    useOrgContextStore.setState({ enabledModules: ["sales", "dashboard"] });
    useAuthStore.setState({ permissions: ["sales.read"], isPlatformOperator: false });
    const articles = tutorialArticles(getAccessibleTutorialChapters(TUTORIAL_CHAPTERS));
    expect(articles.some((article) => article.href.startsWith("/manufacturing/"))).toBe(false);
    expect(articles.some((article) => article.href === "/settings/users-roles")).toBe(false);
    expect(articles.some((article) => article.recommendedNextStep?.href === "/ar/statements")).toBe(false);
  });
});
