import { describe, expect, it } from "vitest";
import { spreadReceipt } from "./settlement-edit";

describe("spreadReceipt", () => {
  it("fills each invoice in order until the money ends", () => {
    const amounts = spreadReceipt(3000, [
      { id: "a", outstanding: 998 },
      { id: "b", outstanding: 352 },
      { id: "c", outstanding: 1398 },
      { id: "d", outstanding: 1270 },
    ]);
    expect(amounts).toEqual({ a: 998, b: 352, c: 1398, d: 252 });
  });
});
