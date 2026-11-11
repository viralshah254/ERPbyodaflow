import { describe, expect, it } from "vitest";
import { parseSfaDeliveryPin } from "./SfaDeliveryAddress";

describe("SFA delivery pins", () => {
  it("accepts a coordinate-only address with a leading SFA separator", () => {
    expect(parseSfaDeliveryPin(" , -1.25, 36.75 ")).toEqual({ latitude: -1.25, longitude: 36.75 });
  });

  it.each(["Westlands, Nairobi", "Shop 14, 36", "-91, 36", "0, 181", ""])("preserves address text or invalid pins: %s", (address) => {
    expect(parseSfaDeliveryPin(address)).toBeNull();
  });
});
