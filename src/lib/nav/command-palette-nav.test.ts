import { describe, expect, it } from "vitest";
import { COMMAND_ACTION_ITEMS, COMMAND_NAV_FALLBACK_ITEMS } from "@/config/command-palette";
import { paymentRecordingCommands, scoreNavItem } from "@/lib/nav/command-palette-nav";

const uomCatalog = COMMAND_NAV_FALLBACK_ITEMS.find((item) => item.href === "/settings/uom");

describe("UOM catalog command search", () => {
  it("opens the catalog for uom, unit of measure, and packaging", () => {
    expect(uomCatalog).toBeDefined();
    for (const query of ["uom", "unit of measure", "units of measure", "packaging"]) {
      const tokens = query.split(/\s+/).filter(Boolean);
      expect(scoreNavItem(uomCatalog!, tokens)).toBeGreaterThan(0);
    }
  });
});

describe("lock screen command search", () => {
  const lockScreen = COMMAND_ACTION_ITEMS.find((item) => item.action === "lock-screen");
  const changePassword = COMMAND_NAV_FALLBACK_ITEMS.find((item) => item.href === "/change-password");

  it("matches lock, password, and lock screen", () => {
    expect(lockScreen).toBeDefined();
    for (const query of ["lock", "password", "lock screen", "lock password"]) {
      const tokens = query.split(/\s+/).filter(Boolean);
      expect(scoreNavItem(lockScreen!, tokens)).toBeGreaterThan(0);
    }
  });

  it("also finds the sign-in password page", () => {
    expect(changePassword).toBeDefined();
    expect(scoreNavItem(changePassword!, ["password"])).toBeGreaterThan(0);
    expect(scoreNavItem(changePassword!, ["lock"])).toBeLessThan(0);
  });
});

describe("payment recording command search", () => {
  it("lists the customer receipt first, then the supplier payment", () => {
    for (const query of ["record", "record payment", "receive payment", "record payment receipt", "payments"]) {
      const commands = paymentRecordingCommands(query);
      expect(commands.map((item) => item.label)).toEqual([
        "Record payment from customer",
        "Record payment to supplier",
      ]);
    }
    expect(paymentRecordingCommands("payment matching")).toEqual([]);
    expect(paymentRecordingCommands("payment runs")).toEqual([]);
  });
});
