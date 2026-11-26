import { describe, expect, it } from "vitest";
import { formatFCFA, paymentMethodLabel } from "./money";

describe("formatFCFA", () => {
  it("formats integer amounts with a franc suffix", () => {
    expect(formatFCFA(15000)).toMatch(/15[\u202f\s]?000 F/);
  });

  it("treats invalid values as zero", () => {
    expect(formatFCFA(undefined)).toBe("0 F");
    expect(formatFCFA(Number.NaN)).toBe("0 F");
  });
});

describe("paymentMethodLabel", () => {
  it("maps known payment methods", () => {
    expect(paymentMethodLabel("cash")).toBe("Espèces");
    expect(paymentMethodLabel("wave")).toBe("Wave");
    expect(paymentMethodLabel("orange_money")).toBe("Orange Money");
    expect(paymentMethodLabel("credit")).toBe("Crédit");
  });
});
