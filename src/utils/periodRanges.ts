import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  capRangeEndToToday,
  type CalendarQuarter,
  rangeFullCalendarMonth,
  rangeFullCalendarQuarter,
  rangeFullCalendarYear,
  rangeRollingWeekWithinCurrentMonth,
  rangeTodayLocal,
  toLocalYmd,
} from "@/utils/dateLocal";

export type GlobalViewPeriodKey = "today" | "last7" | "thisMonth" | "month" | "quarter" | "year";

export type ReportsPeriodKey = "today" | "week" | "month" | "customMonth" | "quarter" | "year";

export type PeriodRangeAnchors = {
  selectedMonth: Dayjs;
  selectedQuarter: Dayjs;
  selectedYear: Dayjs;
};

export function calendarQuarterFromDayjs(d: Dayjs): {
  year: number;
  quarter: CalendarQuarter;
} {
  const quarter = (Math.floor(d.month() / 3) + 1) as CalendarQuarter;
  return { year: d.year(), quarter };
}

function rangeThisMonthToToday(): { start: string; end: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toLocalYmd(from), end: toLocalYmd(now) };
}

function rangeFromQuarterAnchor(anchor: Dayjs): { start: string; end: string } {
  const { year, quarter } = calendarQuarterFromDayjs(anchor);
  return capRangeEndToToday(rangeFullCalendarQuarter(year, quarter));
}

function rangeFromYearAnchor(anchor: Dayjs): { start: string; end: string } {
  return capRangeEndToToday(rangeFullCalendarYear(anchor.year()));
}

export function resolveGlobalViewPeriodRange(
  key: GlobalViewPeriodKey,
  anchors: PeriodRangeAnchors
): { start: string; end: string } {
  if (key === "today") {
    return rangeTodayLocal();
  }
  if (key === "last7") {
    return rangeRollingWeekWithinCurrentMonth();
  }
  if (key === "thisMonth") {
    return rangeThisMonthToToday();
  }
  if (key === "month") {
    const m = anchors.selectedMonth ?? dayjs();
    return capRangeEndToToday(rangeFullCalendarMonth(m.year(), m.month()));
  }
  if (key === "quarter") {
    return rangeFromQuarterAnchor(anchors.selectedQuarter ?? dayjs());
  }
  return rangeFromYearAnchor(anchors.selectedYear ?? dayjs());
}

export function resolveReportsPeriodRange(
  key: ReportsPeriodKey,
  anchors: PeriodRangeAnchors
): { start: string; end: string } {
  if (key === "today") {
    return rangeTodayLocal();
  }
  if (key === "week") {
    return rangeRollingWeekWithinCurrentMonth();
  }
  if (key === "month") {
    return rangeThisMonthToToday();
  }
  if (key === "customMonth") {
    const m = anchors.selectedMonth ?? dayjs();
    return capRangeEndToToday(rangeFullCalendarMonth(m.year(), m.month()));
  }
  if (key === "quarter") {
    return rangeFromQuarterAnchor(anchors.selectedQuarter ?? dayjs());
  }
  return rangeFromYearAnchor(anchors.selectedYear ?? dayjs());
}

export function formatQuarterLabelFr(anchor: Dayjs): string {
  const { quarter, year } = calendarQuarterFromDayjs(anchor);
  return `T${quarter} ${year}`;
}

export function formatYearLabelFr(anchor: Dayjs): string {
  return String(anchor.year());
}

/** Empêche de choisir un trimestre ou une année après la période en cours. */
export function isCalendarQuarterAfterCurrent(d: Dayjs): boolean {
  const now = dayjs();
  const y = d.year();
  const q = Math.floor(d.month() / 3);
  const cy = now.year();
  const cq = Math.floor(now.month() / 3);
  return y > cy || (y === cy && q > cq);
}

export function isCalendarYearAfterCurrent(d: Dayjs): boolean {
  return d.year() > dayjs().year();
}
