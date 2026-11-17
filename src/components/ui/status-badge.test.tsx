import { describe, expect, it } from "vitest";
import { humanStatusLabel } from "./status-badge";

describe("humanStatusLabel", () => {
  it("turns work-order codes into readable labels and leaves mixed case alone", () => {
    expect(humanStatusLabel("IN_PROGRESS")).toBe("In progress");
    expect(humanStatusLabel("DRAFT")).toBe("Draft");
    expect(humanStatusLabel("PENDING_QC")).toBe("Pending QC");
    expect(humanStatusLabel("In Stock")).toBe("In Stock");
  });
});
