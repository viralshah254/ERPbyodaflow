import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TUTORIAL_CHAPTERS } from "@/config/tutorial";
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/tutorial/filter-by-access", () => ({ useFilteredTutorialChapters: (chapters: typeof TUTORIAL_CHAPTERS) => chapters.filter((chapter) => ["processing", "finance", "settings"].includes(chapter.id)) }));
import { TutorialLibrary } from "./TutorialLibrary";
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("searchable ERP tutorial library", () => {
  it("searches instructions and opens a stable customer statement guide link", () => {
    render(<TutorialLibrary />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search ERP tutorials" }), { target: { value: "print customer statement" } });
    expect(screen.getByRole("link", { name: "Customer statements" })).toHaveAttribute("href", "/tutorial/finance/ar-statements");
    fireEvent.change(screen.getByRole("textbox", { name: "Search ERP tutorials" }), { target: { value: "qzxvzznovalidtopic" } });
    expect(screen.getByText("No matching guides in this scope")).toBeInTheDocument();
  });
  it("shows written production steps and hands the exact guide to Gaia", () => {
    const listener = vi.fn(); window.addEventListener("gaia:ask", listener);
    render(<TutorialLibrary chapterId="processing" guideId="manufacturing-production-plan" />);
    expect(screen.getByRole("heading", { name: "How to do it" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Production Plan" })).toHaveAttribute("href", "/manufacturing/production-plan");
    fireEvent.click(screen.getByRole("button", { name: "Explain with Gaia" }));
    expect(listener.mock.calls[0][0].detail).toMatchObject({ tutorialGuide: "/tutorial/processing/manufacturing-production-plan" });
    window.removeEventListener("gaia:ask", listener);
  });
  it("does not render a guide or action link outside the filtered workspace", () => {
    render(<TutorialLibrary chapterId="pricing" guideId="pricing-rules" />);
    expect(screen.getByText("This guide is not available in your current workspace")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Explain with Gaia" })).not.toBeInTheDocument();
  });
});
