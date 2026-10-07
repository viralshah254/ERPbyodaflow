import { describe, expect, it } from "vitest";
import { createScannerBuffer, formatPackQty, matchPackScan, parsePackScan, pushScannerKey, replacePlaceholderZero, suggestedCartonsCount } from "./pack-scan";
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

  it("reads barcode and pieces separated by a tab", () => {
    expect(parsePackScan("6162005202071\t6")).toEqual({ code: "6162005202071", pieces: 6 });
  });

  it("reads EAN-13 with qty digits stuck on when the tab was dropped", () => {
    expect(parsePackScan("61620052020716")).toEqual({ code: "6162005202071", pieces: 6 });
    expect(parsePackScan("616200520207124")).toEqual({ code: "6162005202071", pieces: 24 });
  });

  it("reads a barcode alone", () => {
    expect(parsePackScan("65433213113")).toEqual({ code: "65433213113" });
    expect(parsePackScan("6162005202071")).toEqual({ code: "6162005202071" });
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

  it("uses the focused scan field value on Enter so paste and edits apply", () => {
    const buffer = createScannerBuffer();
    const done = pushScannerKey(buffer, "Enter", 1_000, {
      scanFieldFocused: true,
      scanFieldValue: "6162005202071 6",
    });
    expect(done.scan).toBe("6162005202071 6");
    expect(done.swallow).toBe(true);
  });

  it("keeps a tab after the EAN-13 so focus does not jump and qty stays on the scan", () => {
    let buffer = createScannerBuffer();
    let now = 1_000;
    for (const key of "6162005202071") {
      const result = pushScannerKey(buffer, key, now, { scanFieldFocused: true });
      buffer = result.buffer;
      now += 10;
    }
    const tab = pushScannerKey(buffer, "Tab", now, { scanFieldFocused: true });
    expect(tab.swallow).toBe(true);
    buffer = tab.buffer;
    now += 10;
    const qty = pushScannerKey(buffer, "6", now, { scanFieldFocused: true });
    buffer = qty.buffer;
    now += 10;
    const done = pushScannerKey(buffer, "Enter", now, {
      scanFieldFocused: true,
      // Input drops the tab; buffer kept it.
      scanFieldValue: "61620052020716",
    });
    expect(done.scan).toBe("6162005202071\t6");
    expect(parsePackScan(done.scan!)).toEqual({ code: "6162005202071", pieces: 6 });
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

describe("replacePlaceholderZero", () => {
  it("drops the starting zero when a count is typed after it", () => {
    expect(replacePlaceholderZero("0", "05")).toBe("5");
    expect(replacePlaceholderZero("0", "050")).toBe("50");
  });

  it("keeps a decimal that starts from zero", () => {
    expect(replacePlaceholderZero("0", "0.")).toBe("0.");
    expect(replacePlaceholderZero("0", "0.5")).toBe("0.5");
  });

  it("leaves a count that is already past zero", () => {
    expect(replacePlaceholderZero("10", "105")).toBe("105");
    expect(replacePlaceholderZero("5", "50")).toBe("50");
  });
});

describe("matchPackScan", () => {
  it("adds the scanned pieces onto the matching order line", () => {
    const hit = matchPackScan("65433213113 24", [cartonLine], { l1: 0 });
    expect(hit).toEqual({ ok: true, lineId: "l1", addPieces: 24, nextPicked: 24 });
  });

  it("treats a product barcode alone as one pack when the line has unitsPer", () => {
    const hit = matchPackScan("65433213113", [cartonLine], { l1: 0 });
    expect(hit).toEqual({ ok: true, lineId: "l1", addPieces: 24, nextPicked: 24 });
  });

  it("treats a product barcode alone as one piece when there is no pack size", () => {
    const loose: PackScanLine = {
      id: "l1",
      barcode: "6162005202071",
      quantity: 12,
      unitsPer: 1,
    };
    const hit = matchPackScan("6162005202071", [loose], { l1: 0 });
    expect(hit.ok && hit.addPieces).toBe(1);
  });

  it("adds the piece count printed after the barcode", () => {
    const loose: PackScanLine = {
      id: "l1",
      barcode: "6162005202071",
      quantity: 12,
      unitsPer: 1,
    };
    const hit = matchPackScan("6162005202071 6", [loose], { l1: 0 });
    expect(hit).toEqual({ ok: true, lineId: "l1", addPieces: 6, nextPicked: 6 });
  });

  it("treats a packaging barcode alone as one full pack", () => {
    const hit = matchPackScan("PACK-65433213113", [cartonLine], { l1: 0 });
    expect(hit).toMatchObject({ ok: true, addPieces: 24, nextPicked: 24 });
  });

  it("uses pack barcode unitsPer even when the same code is the product barcode", () => {
    const line: PackScanLine = {
      id: "l1",
      barcode: "6162005202071",
      quantity: 24,
      unitsPer: 1,
      packBarcodes: [{ barcode: "6162005202071", unitsPer: 6 }],
    };
    const hit = matchPackScan("6162005202071", [line], { l1: 0 });
    expect(hit).toEqual({ ok: true, lineId: "l1", addPieces: 6, nextPicked: 6 });
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
