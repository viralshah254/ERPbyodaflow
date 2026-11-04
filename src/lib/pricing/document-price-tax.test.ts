import { describe, expect, it } from "vitest";
import { repriceDocumentLineTax } from "./document-price-tax";
describe("price tag tax totals", () => {
  it("keeps VAT in gross amounts for the reported invoice", () => {
    const lines = [100, 150, 100].map(qty => repriceDocumentLineTax(37.93, qty, 16, false));
    expect(lines.map(line => line.amount)).toEqual([4399.88, 6599.82, 4399.88]);
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBeCloseTo(15399.58);
    expect(lines.reduce((sum, line) => sum + line.tax, 0)).toBeCloseTo(2124.08);
    for (const line of lines) expect(line.tax).toBeCloseTo(line.amount * 16 / 116, 2);
  });
  it("extracts included VAT without adding it twice", () => {
    expect(repriceDocumentLineTax(116, 2, 16, true)).toEqual({ amount: 232, tax: 32 });
  });
  it("recalculates after a new price rather than carrying old tax", () => {
    expect(repriceDocumentLineTax(50, 100, 16, false)).toEqual({ amount: 5800, tax: 800 });
    expect(repriceDocumentLineTax(50, 100, 0, false)).toEqual({ amount: 5000, tax: 0 });
  });
});
