import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import {
  calendarQuarterFromDayjs,
  isCalendarQuarterAfterCurrent,
  isCalendarYearAfterCurrent,
  resolveGlobalViewPeriodRange,
  resolveReportsPeriodRange,
} from "./periodRanges";

const anchors = () => ({
  selectedMonth: dayjs("2026-03-15"),
  selectedQuarter: dayjs("2026-04-01"),
  selectedYear: dayjs("2025-01-01"),
});

describe("calendarQuarterFromDayjs", () => {
  it("maps months to civil quarters", () => {
    expect(calendarQuarterFromDayjs(dayjs("2026-01-10"))).toEqual({
      year: 2026,
      quarter: 1,
    });
    expect(calendarQuarterFromDayjs(dayjs("2026-04-01"))).toEqual({
      year: 2026,
      quarter: 2,
    });
    expect(calendarQuarterFromDayjs(dayjs("2026-12-31"))).toEqual({
      year: 2026,
      quarter: 4,
    });
  });
});

describe("resolveGlobalViewPeriodRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns capped current quarter", () => {
    expect(resolveGlobalViewPeriodRange("quarter", anchors())).toEqual({
      start: "2026-04-01",
      end: "2026-06-01",
    });
  });

  it("returns capped current year", () => {
    const a = {
      ...anchors(),
      selectedYear: dayjs("2026-01-01"),
    };
    expect(resolveGlobalViewPeriodRange("year", a)).toEqual({
      start: "2026-01-01",
      end: "2026-06-01",
    });
  });

  it("returns full past quarter", () => {
    const a = {
      ...anchors(),
      selectedQuarter: dayjs("2025-10-01"),
    };
    expect(resolveGlobalViewPeriodRange("quarter", a)).toEqual({
      start: "2025-10-01",
      end: "2025-12-31",
    });
  });

  it("caps current month picker range", () => {
    const a = {
      ...anchors(),
      selectedMonth: dayjs("2026-06-01"),
    };
    expect(resolveGlobalViewPeriodRange("month", a)).toEqual({
      start: "2026-06-01",
      end: "2026-06-01",
    });
  });
});

describe("resolveReportsPeriodRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("matches global quarter logic", () => {
    expect(resolveReportsPeriodRange("quarter", anchors())).toEqual({
      start: "2026-04-01",
      end: "2026-06-01",
    });
  });

  it("returns past year in full", () => {
    expect(resolveReportsPeriodRange("year", anchors())).toEqual({
      start: "2025-01-01",
      end: "2025-12-31",
    });
  });
});

describe("isCalendarQuarterAfterCurrent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks future quarters only", () => {
    expect(isCalendarQuarterAfterCurrent(dayjs("2026-04-01"))).toBe(false);
    expect(isCalendarQuarterAfterCurrent(dayjs("2026-07-01"))).toBe(true);
    expect(isCalendarQuarterAfterCurrent(dayjs("2027-01-01"))).toBe(true);
  });
});

describe("isCalendarYearAfterCurrent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks years after current", () => {
    expect(isCalendarYearAfterCurrent(dayjs("2026-01-01"))).toBe(false);
    expect(isCalendarYearAfterCurrent(dayjs("2027-01-01"))).toBe(true);
  });
});
