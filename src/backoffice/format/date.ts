export const BACKOFFICE_TIMEZONE = "Africa/Dakar";

function parts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BACKOFFICE_TIMEZONE,
      ...options,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

function asDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const date = asDate(value);
  if (!date) return "—";
  const p = parts(date, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "—";
  const date = asDate(value);
  if (!date) return "—";
  const p = parts(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function formatRelative(
  value: string | Date | null | undefined,
  now: Date = new Date(),
  locale: "fr" | "en" = "fr"
): string {
  if (value == null || value === "") return "—";
  const date = asDate(value);
  if (!date) return "—";
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(minutes);
  const future = minutes > 0;
  if (abs < 1) return locale === "fr" ? "à l'instant" : "just now";
  const unit =
    abs < 60
      ? { n: abs, fr: "min", en: "min" }
      : abs < 60 * 24
        ? { n: Math.round(abs / 60), fr: "h", en: "h" }
        : { n: Math.round(abs / (60 * 24)), fr: "j", en: "d" };
  if (locale === "en") {
    return future ? `in ${unit.n} ${unit.en}` : `${unit.n} ${unit.en} ago`;
  }
  return future ? `dans ${unit.n} ${unit.fr}` : `il y a ${unit.n} ${unit.fr}`;
}

export type DatePreset = "today" | "7d" | "30d" | "month" | "lastMonth" | "custom";

export type DateRange = { from: string; to: string };

function dakarCalendar(date: Date): { year: number; month: number; day: number } {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}

function utcFromDakarDay(year: number, month: number, day: number, end = false): Date {
  return new Date(
    Date.UTC(year, month - 1, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0)
  );
}

function shiftDays(year: number, month: number, day: number, delta: number) {
  const date = utcFromDakarDay(year, month, day);
  date.setUTCDate(date.getUTCDate() + delta);
  return dakarCalendar(date);
}

export function resolveDatePreset(
  preset: Exclude<DatePreset, "custom">,
  now = new Date()
): DateRange {
  const today = dakarCalendar(now);
  if (preset === "today") {
    return {
      from: utcFromDakarDay(today.year, today.month, today.day).toISOString(),
      to: utcFromDakarDay(today.year, today.month, today.day, true).toISOString(),
    };
  }
  if (preset === "7d" || preset === "30d") {
    const start = shiftDays(today.year, today.month, today.day, preset === "7d" ? -6 : -29);
    return {
      from: utcFromDakarDay(start.year, start.month, start.day).toISOString(),
      to: utcFromDakarDay(today.year, today.month, today.day, true).toISOString(),
    };
  }
  if (preset === "month") {
    return {
      from: utcFromDakarDay(today.year, today.month, 1).toISOString(),
      to: utcFromDakarDay(today.year, today.month, today.day, true).toISOString(),
    };
  }
  const previous =
    today.month === 1
      ? { year: today.year - 1, month: 12 }
      : { year: today.year, month: today.month - 1 };
  const lastDay = new Date(Date.UTC(previous.year, previous.month, 0)).getUTCDate();
  return {
    from: utcFromDakarDay(previous.year, previous.month, 1).toISOString(),
    to: utcFromDakarDay(previous.year, previous.month, lastDay, true).toISOString(),
  };
}
