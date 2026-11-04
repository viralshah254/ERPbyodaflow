import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BomPilotHelp, type BomGuideStep } from "./BomPilotHelp";
import { useAuthStore } from "@/stores/auth-store";
const key = "erp-bom-guide:v1:local:local:list";
const steps: BomGuideStep[] = [
  { id: "search", target: "#recipe-search", title: "Find a recipe", description: "Type a code.", complete: false },
  { id: "review", target: "#recipe-output", title: "Check batch output", description: "Check units." },
];
function fixture(items = steps) {
  return <><input id="recipe-search" /><div id="recipe-output">10 KG</div><BomPilotHelp screen="list" steps={items} /></>;
}
beforeEach(() => { localStorage.clear(); useAuthStore.setState({ user: null, org: null }); });
afterEach(cleanup);
describe("BOM pilot guide", () => {
  it("waits for the page action and requires Finish before recording completion", () => {
    const view = render(fixture());
    fireEvent.click(screen.getByRole("button", { name: /help with/i }));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    view.rerender(fixture([{ ...steps[0], complete: true }, steps[1]]));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(JSON.parse(localStorage.getItem(key)!).status).toBe("in-progress");
    fireEvent.click(screen.getByRole("button", { name: "Finish walkthrough" }));
    expect(JSON.parse(localStorage.getItem(key)!).status).toBe("completed");
    expect(screen.getByText("Page walkthrough complete")).toBeVisible();
  });
  it("saves an exit as in progress and restores the step", () => {
    render(fixture([{ ...steps[0], complete: true }, steps[1]]));
    fireEvent.click(screen.getByRole("button", { name: /help with/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Save and exit guide" }));
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(expect.objectContaining({ status: "in-progress", index: 1 }));
    fireEvent.click(screen.getByRole("button", { name: /help with/i }));
    expect(screen.getByRole("heading", { name: "Check batch output" })).toBeVisible();
  });
  it("waits for a missing target and recovers when it mounts", async () => {
    render(fixture([{ ...steps[0], target: "#delayed", complete: true }]));
    fireEvent.click(screen.getByRole("button", { name: /help with/i }));
    expect(screen.getByRole("button", { name: "Finish walkthrough" })).toBeDisabled();
    const target = document.createElement("div"); target.id = "delayed"; document.body.append(target);
    await waitFor(() => expect(screen.getByRole("button", { name: "Finish walkthrough" })).toBeEnabled());
    cleanup();
    target.remove();
  });
  it("cleans up highlights and restores focus on Escape without completion", () => {
    render(fixture());
    const launcher = screen.getByRole("button", { name: /help with/i });
    fireEvent.click(launcher);
    expect(document.querySelector<HTMLElement>("#recipe-search")!.style.boxShadow).not.toBe("");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Interactive BOM guide" })).not.toBeInTheDocument();
    expect(document.querySelector<HTMLElement>("#recipe-search")!.style.boxShadow).toBe("");
    expect(launcher).toHaveFocus();
    expect(JSON.parse(localStorage.getItem(key)!).status).toBe("in-progress");
  });
  it("separates progress for each screen", () => {
    localStorage.setItem(key, JSON.stringify({ status: "in-progress", index: 1 }));
    render(<><div id="recipe-search" /><div id="recipe-output" /><BomPilotHelp screen="new" steps={steps} /></>);
    fireEvent.click(screen.getByRole("button", { name: /help with/i }));
    expect(screen.getByRole("heading", { name: "Find a recipe" })).toBeVisible();
  });
});
