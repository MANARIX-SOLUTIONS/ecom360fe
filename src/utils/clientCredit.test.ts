import { describe, expect, it } from "vitest";
import {
  canRecordClientPayment,
  creditBalanceCssVar,
  creditBalanceTagColor,
} from "./clientCredit";

describe("creditBalanceTagColor", () => {
  it("marks outstanding debt as warning", () => {
    expect(creditBalanceTagColor(1500)).toBe("warning");
  });

  it("marks overpayment as success", () => {
    expect(creditBalanceTagColor(-200)).toBe("success");
  });

  it("marks settled balance as default", () => {
    expect(creditBalanceTagColor(0)).toBe("default");
  });
});

describe("creditBalanceCssVar", () => {
  it("uses warning for debt", () => {
    expect(creditBalanceCssVar(1)).toBe("var(--color-warning)");
  });
});

describe("canRecordClientPayment", () => {
  it("allows repayment only for named clients with debt on a credit plan", () => {
    expect(
      canRecordClientPayment({
        canClientCredits: true,
        balance: 5000,
        isWalkIn: false,
      })
    ).toBe(true);
  });

  it("blocks walk-in, starter plan, and zero/negative balance", () => {
    expect(
      canRecordClientPayment({
        canClientCredits: true,
        balance: 5000,
        isWalkIn: true,
      })
    ).toBe(false);
    expect(
      canRecordClientPayment({
        canClientCredits: false,
        balance: 5000,
        isWalkIn: false,
      })
    ).toBe(false);
    expect(
      canRecordClientPayment({
        canClientCredits: true,
        balance: 0,
        isWalkIn: false,
      })
    ).toBe(false);
    expect(
      canRecordClientPayment({
        canClientCredits: true,
        balance: -100,
        isWalkIn: false,
      })
    ).toBe(false);
  });
});
