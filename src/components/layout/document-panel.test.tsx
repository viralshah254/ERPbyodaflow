import * as React from "react";

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PageHeader } from "./page-header";
import { PageShell } from "./page-shell";

function mockWidth(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: width >= 1440,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  })));
  return (next: number) => act(() => {
    width = next;
    listeners.forEach((listener) => listener());
  });
}

function renderDocument() {
  render(
    <PageShell rightSlot={<p>Delivery still pending</p>}>
      <PageHeader title="INV0008" help={null} showCommandHint={false} showRightPanelToggle actionsBelow actions={<button>Edit</button>} />
      <input aria-label="Delivery address" defaultValue="Headquarters" />
    </PageShell>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([375, 768, 1024, 1366])("opens the summary on demand at %ipx", (width) => {
  mockWidth(width);
  renderDocument();
  expect(screen.queryByText("Delivery still pending")).toBeNull();
  expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Summary" }));
  const drawer = screen.getByRole("dialog", { name: "Document summary" });
  expect(within(drawer).getByText("Delivery still pending")).toBeTruthy();
  fireEvent.click(within(drawer).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("keeps unsaved document input when resizing from a docked summary to a drawer", () => {
  const resize = mockWidth(1600);
  renderDocument();
  expect(within(screen.getByRole("complementary")).getByText("Delivery still pending")).toBeTruthy();
  const input = screen.getByRole("textbox", { name: "Delivery address" }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Warehouse gate" } });

  resize(1024);
  expect(screen.queryByRole("complementary")).toBeNull();
  expect(screen.getByRole("button", { name: "Summary" })).toBeTruthy();
  expect((screen.getByRole("textbox", { name: "Delivery address" }) as HTMLInputElement).value).toBe("Warehouse gate");
});
