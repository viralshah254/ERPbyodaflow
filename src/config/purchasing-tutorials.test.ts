import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTutorialForRoute, TUTORIAL_CHAPTERS } from "./tutorial";
import { getTourForRoute } from "./tutorial-tours";
import { resolveScreenGuide } from "@/lib/tutorial/screen-guides";
import { searchTutorialArticles, tutorialArticles } from "@/lib/tutorial/knowledge";
import { COMPANY_EMAIL_GUIDE, REQUISITION_ITEM_GUIDE } from "./purchasing-tutorials";
describe("requisition to emailed PO tutorial", () => {
 it("publishes the end-to-end workflow in the searchable handbook and Gaia reference", () => {
  const articles = tutorialArticles(TUTORIAL_CHAPTERS);
  const workflow = articles.find(article => article.key === "request-approve-po-email")!;
  expect(workflow).toBeTruthy();
  expect(workflow.guideSteps?.join(" ")).toMatch(/manual|manually/);
  expect(workflow.guideSteps?.join(" ")).toContain("last active supplier");
  expect(workflow.guideSteps?.join(" ")).toContain("Approve & send");
  expect(searchTutorialArticles(articles, "requisition supplier email", 10).some(article => article.key === workflow.key)).toBe(true);
 });
 it("gives an actual item-review record its own guide and observational tour", () => {
  const path = "/purchasing/requests/example-request/review";
  expect(getTutorialForRoute(path)?.guideSteps).toEqual(REQUISITION_ITEM_GUIDE.guideSteps);
  expect(resolveScreenGuide(path)?.tasks).toEqual(REQUISITION_ITEM_GUIDE.guideSteps);
  const tour = getTourForRoute(path)!;
  expect(tour.route).toBe(path); expect(tour.tourId).not.toBe("purchasing-requests-tour");
  expect(tour.steps.some(step => step.element === "[data-tutorial-hint=purchase-request-save-review]")).toBe(true);
  expect(tour.steps.map(step => step.description).join(" ")).toContain("never saves");
 });
 it("explains approval, provider acceptance, unknown outcomes and original-recipient resends on PO records", () => {
  const path = "/docs/purchase-order/example-po";
  const text = resolveScreenGuide(path)!.tasks.join(" ");
  expect(text).toContain("Accepted by provider is not confirmed delivery"); expect(text).toContain("Unknown"); expect(text).toContain("original recipient and PDF"); expect(text).toContain("changes after review");
  expect(getTourForRoute(path)?.route).toBe(path);
 });
 it("documents company-owned/managed setup, both DNS proofs and the optional signed webhook", () => {
  expect(getTutorialForRoute("/settings/company-email")?.guideSteps).toEqual(COMPANY_EMAIL_GUIDE.guideSteps);
  const text = resolveScreenGuide("/settings/company-email")!.tasks.join(" ");
  expect(text).toContain("Company-owned SendGrid"); expect(text).toContain("ownership TXT"); expect(text).toContain("signed Event Webhook"); expect(text).toContain("disables sending");
 });
 it("binds the tutorial hints to real controls without collecting key fields", () => {
  const review = readFileSync("src/app/(dashboard)/purchasing/requests/[id]/review/page.tsx", "utf8");
  const company = readFileSync("src/app/(dashboard)/settings/company-email/page.tsx", "utf8");
  const email = readFileSync("src/components/purchasing/PurchaseOrderEmailPanel.tsx", "utf8");
  for (const name of ["purchase-request-item-review", "purchase-request-save-review", "purchase-request-create-orders"]) expect(review).toContain(`data-tutorial-hint="${name}"`);
  for (const name of ["company-email-sender", "company-email-domain"]) expect(company).toContain(`data-tutorial-hint="${name}"`);
  expect(email).toContain('data-tutorial-hint="purchase-order-email"');
 });
});
