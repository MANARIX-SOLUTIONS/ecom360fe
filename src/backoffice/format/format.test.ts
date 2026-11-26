import { describe, expect, it } from "vitest";
import { formatDateTime, formatRelative, resolveDatePreset } from "./date";
import { formatMoney } from "./money";
import { formatNumber } from "./number";

describe("backoffice formatters", () => {
  it("formats XOF with a narrow no-break space and no decimals", () => {
    expect(formatMoney(405500)).toBe("405\u202F500 F CFA");
    expect(formatMoney(0)).toBe("0 F CFA");
    expect(formatMoney(null)).toBe("—");
    expect(formatNumber(12000)).toBe("12\u202F000");
  });

  it("formats Dakar dates as day/month/year", () => {
    expect(formatDateTime("2026-10-08T20:52:00.000Z")).toBe("08/10/2026 20:52");
  });

  it("uses a relative label and keeps the absolute form separate", () => {
    const at = new Date("2026-10-08T20:52:00.000Z");
    const now = new Date("2026-10-08T20:57:00.000Z");
    expect(formatRelative(at, now, "fr")).toBe("il y a 5 min");
    expect(formatRelative(at, now, "en")).toBe("5 min ago");
  });

  it("resolves the current month inside the Dakar calendar", () => {
    const range = resolveDatePreset("month", new Date("2026-10-08T20:52:00.000Z"));
    expect(range.from.startsWith("2026-10-01")).toBe(true);
    expect(range.to.startsWith("2026-10-08")).toBe(true);
  });
});
