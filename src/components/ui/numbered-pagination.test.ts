import { describe, expect, it } from "vitest";
import { pageNumberWindow } from "./numbered-pagination";

describe("pageNumberWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageNumberWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("keeps the first and last pages with gaps around the current page", () => {
    expect(pageNumberWindow(1, 10)).toEqual([1, 2, null, 9, 10]);
    expect(pageNumberWindow(5, 10)).toEqual([1, 2, null, 4, 5, 6, null, 9, 10]);
    expect(pageNumberWindow(10, 10)).toEqual([1, 2, null, 9, 10]);
  });
});
