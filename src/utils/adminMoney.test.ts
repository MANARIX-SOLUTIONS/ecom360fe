import { describe, expect, it } from "vitest";
import {
  failedPaymentRate,
  formatAdminMoney,
  formatAdminPercent,
  formatAdminRate,
  periodDelta,
} from "./adminMoney";

describe("adminMoney", () => {
  it("formats XOF with a locale-aware grouping", () => {
    expect(formatAdminMoney(405500, "XOF")).toBe("405\u202f500 F CFA");
  });

  it("does not invent a comparison when the previous period is zero", () => {
    expect(periodDelta(100, 0)).toBeNull();
    expect(periodDelta(120, 100)).toBe(20);
  });

  it("formats signed percentages", () => {
    expect(formatAdminPercent(-12.34)).toBe("-12.3 %");
  });

  it("does not invent a failed-payment rate without attempts", () => {
    expect(failedPaymentRate(2, 0)).toBeNull();
    expect(failedPaymentRate(2, undefined)).toBeNull();
    expect(failedPaymentRate(1, 4)).toBe(25);
    expect(formatAdminRate(25)).toBe("25.0 %");
  });
});
