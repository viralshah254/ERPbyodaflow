import { describe, expect, it } from "vitest";
import { createScannerBuffer, formatPackQty, matchPackScan, parsePackScan, pushScannerKey, suggestedCartonsCount } from "./pack-scan";
import type { PackScanLine } from "./pack-scan";

const cartonLine: PackScanLine = {
  id: "l1",
  sku: "SKU-3383",
  barcode: "65433213113",
  quantity: 48,
  unitsPer: 24,
  documentUnit: "CARTON",
  baseUom: "PCS",
  packBarcodes: [{ barcode: "PACK-65433213113", unitsPer: 24 }],
};

describe("parsePackScan", () => {
  it("reads barcode and pieces", () => {
    expect(parsePackScan("65433213113 24")).toEqual({ code: "65433213113", pieces: 24 });
  });

  it("reads a barcode alone", () => {
    expect(parsePackScan("65433213113")).toEqual({ code: "65433213113" });
  });

  it("rejects a zero piece count", () => {
    expect(parsePackScan("65433213113 0")).toEqual({ error: "Piece count must be greater than zero" });
  });
});

describe("pushScannerKey", () => {
  it("captures a fast barcode even when the scan field is not focused", () => {
    let buffer = createScannerBuffer();
    let now = 1_000;
    for (const key of "65433213113 24") {
      const result = pushScannerKey(buffer, key, now, { scanFieldFocused: false });
      if (buffer.text.length > 0) expect(result.swallow).toBe(true);
      buffer = result.buffer;
      now += 10;
    }
    const done = pushScannerKey(buffer, "Enter", now, { scanFieldFocused: false });
    expect(done.scan).toBe("65433213113 24");
    expect(done.swallow).toBe(true);
  });

  it("ignores slow typing outside the scan field", () => {
    let buffer = createScannerBuffer();
    const first = pushScannerKey(buffer, "a", 1_000, { scanFieldFocused: false });
    buffer = first.buffer;
    const second = pushScannerKey(buffer, "b", 1_400, { scanFieldFocused: false });
    expect(second.swallow).toBe(false);
    expect(second.scan).toBeUndefined();
  });
});

describe("matchPackScan", () => {
  it("adds the scanned pieces onto the matching order line", () => {
    const hit = matchPackScan("65433213113 24", [cartonLine], { l1: 0 });
    expect(hit).toEqual({ ok: true, lineId: "l1", addPieces: 24, nextPicked: 24 });
  });

  it("treats a product barcode alone as one piece", () => {
    const hit = matchPackScan("65433213113", [cartonLine], { l1: 0 });
    expect(hit.ok && hit.addPieces).toBe(1);
  });

  it("treats a packaging barcode alone as one full pack", () => {
    const hit = matchPackScan("PACK-65433213113", [cartonLine], { l1: 0 });
    expect(hit).toMatchObject({ ok: true, addPieces: 24, nextPicked: 24 });
  });

  it("rejects a code that is not on the order", () => {
    const miss = matchPackScan("999 12", [cartonLine], {});
    expect(miss).toEqual({ ok: false, error: "Not on this order" });
  });

  it("rejects a scan that would pass the ordered pieces", () => {
    const miss = matchPackScan("65433213113 24", [cartonLine], { l1: 48 });
    expect(miss.ok).toBe(false);
    if (!miss.ok) {
      expect(miss.over).toBe(true);
      expect(miss.lineId).toBe("l1");
    }
  });

  it("fills the line that still has room when the product is on two lines", () => {
    const second = { ...cartonLine, id: "l2", quantity: 24 };
    const hit = matchPackScan("65433213113 24", [{ ...cartonLine, quantity: 24 }, second], { l1: 24, l2: 0 });
    expect(hit).toMatchObject({ ok: true, lineId: "l2", nextPicked: 24 });
  });
});

describe("formatPackQty", () => {
  it("shows whole cartons", () => {
    expect(formatPackQty(24, cartonLine)).toBe("1 carton");
    expect(formatPackQty(48, cartonLine)).toBe("2 cartons");
  });

  it("shows leftover pieces", () => {
    expect(formatPackQty(30, cartonLine)).toBe("1 carton + 6 pcs");
  });

  it("shows pieces when no pack is configured", () => {
    expect(formatPackQty(24, { unitsPer: 1, baseUom: "PCS" })).toBe("24 pcs");
    expect(formatPackQty(24, {})).toBe("24 pcs");
  });

  it("does not treat a 25kg product size as the order unit", () => {
    expect(formatPackQty(1, { unitsPer: 1, documentUnit: "PCS", baseUom: "KG" })).toBe("1 pcs");
    expect(formatPackQty(0, { documentUnit: "PCS", baseUom: "KG" })).toBe("0 pcs");
  });
});

describe("suggestedCartonsCount", () => {
  it("sums whole packs from scanned pieces", () => {
    expect(suggestedCartonsCount([cartonLine], { l1: 30 })).toBe(1);
    expect(suggestedCartonsCount([cartonLine], { l1: 48 })).toBe(2);
  });
});
