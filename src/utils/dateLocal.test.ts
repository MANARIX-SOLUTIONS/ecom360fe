import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  capRangeEndToToday,
  inclusiveDaysBetween,
  rangeFullCalendarQuarter,
  rangeFullCalendarYear,
  toLocalYmd,
  ymdFromIsoLocal,
} from "./dateLocal";

describe("rangeFullCalendarQuarter", () => {
  it("returns T1 bounds", () => {
    expect(rangeFullCalendarQuarter(2026, 1)).toEqual({
      start: "2026-01-01",
      end: "2026-03-31",
    });
  });

  it("returns T4 bounds", () => {
    expect(rangeFullCalendarQuarter(2025, 4)).toEqual({
      start: "2025-10-01",
      end: "2025-12-31",
    });
  });
});

describe("rangeFullCalendarYear", () => {
  it("returns full calendar year", () => {
    expect(rangeFullCalendarYear(2024)).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
    });
  });

  it("handles leap year end", () => {
    expect(rangeFullCalendarYear(2024).end).toBe("2024-12-31");
  });
});

describe("capRangeEndToToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves past ranges unchanged", () => {
    const range = { start: "2025-01-01", end: "2025-12-31" };
    expect(capRangeEndToToday(range)).toEqual(range);
  });

  it("caps end to today when range extends into the future", () => {
    expect(capRangeEndToToday({ start: "2026-01-01", end: "2026-12-31" })).toEqual({
      start: "2026-01-01",
      end: "2026-06-01",
    });
  });
});

describe("ymdFromIsoLocal", () => {
  it("matches toLocalYmd from Date parse", () => {
    const iso = "2026-06-15T22:00:00.000Z";
    expect(ymdFromIsoLocal(iso)).toBe(toLocalYmd(new Date(iso)));
  });
});

describe("inclusiveDaysBetween", () => {
  it("counts single day as 1", () => {
    expect(inclusiveDaysBetween("2026-05-10", "2026-05-10")).toBe(1);
  });

  it("counts inclusive span", () => {
    expect(inclusiveDaysBetween("2026-05-01", "2026-05-31")).toBe(31);
  });
});
