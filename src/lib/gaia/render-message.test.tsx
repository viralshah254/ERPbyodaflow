import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GaiaMessageBody } from "./render-message";
afterEach(cleanup);
it("keeps ERP guide links clickable while removing unsafe links and injected HTML", () => {
  const { container } = render(<GaiaMessageBody text={'[Guide](/tutorial/processing/manufacturing-production-plan) [Bad](javascript:alert(1)) <img src=x onerror="alert(1)"> [External](https://example.test/help)'} />);
  expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("href", "/tutorial/processing/manufacturing-production-plan");
  expect(screen.getByRole("link", { name: "External" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(container.innerHTML).not.toContain("javascript:"); expect(container.querySelector("img")).toBeNull();
});
