import { describe, expect, it } from "vitest";
import { statementReadyBankAccount, tidyCounterpartyName, formatReconDate } from "./bank-account-label";

describe("statementReadyBankAccount", () => {
  it("splits a bank title from the account number and title-cases it", () => {
    const ready = statementReadyBankAccount({
      name: "BANK OF BARODA(KENYA) LTD-95870200001540",
      accountNumber: "95870200001540",
      bankName: "BANK OF BARODA(KENYA) LTD-95870200001540",
    });
    expect(ready.name).toBe("Bank of Baroda (Kenya) Ltd-95870200001540");
    expect(ready.bank).toBe("Bank of Baroda (Kenya) Ltd");
    expect(ready.accountNumber).toBe("95870200001540");
    expect(ready.accountNumberMissing).toBe(false);
    expect(ready.usesStatement).toBe(true);
  });

  it("repairs M-Oriental names and does not treat a slug as a statement number", () => {
    const limited = statementReadyBankAccount({
      name: "MORIENTAL BANK LIMITED",
      accountNumber: "MORIENTAL-BANK-LIMITED",
      bankName: "MORIENTAL BANK LIMITED",
    });
    expect(limited.name).toBe("M-Oriental Bank Limited");
    expect(limited.bank).toBe("M-Oriental Bank Limited");
    expect(limited.accountNumberMissing).toBe(true);

    const dollar = statementReadyBankAccount({
      name: "M-ORIENTAL BANK LTD- $ AC",
      accountNumber: "M-ORIENTAL-BANK-LTD--$-AC",
      bankName: "M-ORIENTAL BANK LTD- $ AC",
    });
    expect(dollar.name).toBe("M-Oriental Bank Ltd-$ AC");
    expect(dollar.bank).toBe("M-Oriental Bank Ltd");
    expect(dollar.accountNumberMissing).toBe(true);
  });

  it("keeps short bank codes in capitals", () => {
    const vcb = statementReadyBankAccount({
      name: "VCB USD",
      accountNumber: "VCB-USD",
      bankName: "VCB USD",
    });
    expect(vcb.name).toBe("VCB USD");
    expect(vcb.bank).toBe("VCB USD");
    const ir = statementReadyBankAccount({
      name: "VCB USD IR",
      accountNumber: "VCB-USD-IR",
      bankName: "VCB USD IR",
    });
    expect(ir.name).toBe("VCB USD IR");
  });

  it("keeps petty cash and the travel float off statement reconciliation", () => {
    expect(statementReadyBankAccount({ name: "Petty Cash 2020", accountNumber: "PETTY-CASH-2020" }).usesStatement).toBe(false);
    expect(statementReadyBankAccount({ name: "PETTY-CASH-GIKOMBA", accountNumber: "PETTY-CASH-GIKOMBA" }).usesStatement).toBe(false);
    expect(statementReadyBankAccount({ name: "Upcountry Travel Float", accountNumber: "Upcountry-Travel-Float" }).usesStatement).toBe(false);
  });
});

describe("recon display text", () => {
  it("corrects the Frankmatt receipt name and formats statement dates", () => {
    expect(tidyCounterpartyName("FRANKMATT SUPERMAKET--MUMIAS & SABATIA")).toBe("FRANKMATT SUPERMARKET – MUMIAS & SABATIA");
    expect(formatReconDate("2026-11-12")).toBe("12 Nov 2026");
  });
});
