/**
 * Dates calendaires en fuseau local (YYYY-MM-DD pour les filtres API).
 * Évite les erreurs de jour avec `toISOString().slice(0, 10)` (UTC).
 */

export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Une seule journée : aujourd'hui (local), toujours dans le mois en cours. */
export function rangeTodayLocal(): { start: string; end: string } {
  const y = toLocalYmd(new Date());
  return { start: y, end: y };
}

/**
 * Fenêtre type « 7 derniers jours » / « cette semaine » : [aujourd'hui − 6 jours, aujourd'hui],
 * plafonnée au 1er du mois en cours (aucune remontée au mois précédent).
 */
export function rangeRollingWeekWithinCurrentMonth(): { start: string; end: string } {
  const now = new Date();
  const endYmd = toLocalYmd(now);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const from = weekStart.getTime() < monthStart.getTime() ? monthStart : weekStart;
  return { start: toLocalYmd(from), end: endYmd };
}

/**
 * Interprète YYYY-MM-DD en date locale (midi) pour éviter les décalages UTC
 * lors de l’affichage (toLocaleDateString).
 */
export function parseYmdLocal(ymd: string): Date {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y == null || m == null || d == null || Number.isNaN(y)) {
    return new Date(ymd);
  }
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Résumé période pour l’UI (une journée ou plage du → au). */
export function formatRangeSummaryFr(startYmd: string, endYmd: string): string {
  const from = parseYmdLocal(startYmd);
  const to = parseYmdLocal(endYmd);
  if (startYmd === endYmd) {
    return from.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const fromStr = from.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const toStr = to.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fromStr} → ${toStr}`;
}

/** Mois civil complet (1er → dernier jour), en local. */
export function rangeFullCalendarMonth(
  year: number,
  monthIndex0: number
): { start: string; end: string } {
  const start = new Date(year, monthIndex0, 1);
  const end = new Date(year, monthIndex0 + 1, 0);
  return { start: toLocalYmd(start), end: toLocalYmd(end) };
}

/** Jour civil local à partir d’un instant ISO (évite le décalage UTC de slice(0, 10)). */
export function ymdFromIsoLocal(iso: string): string {
  try {
    return toLocalYmd(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Compare deux dates YYYY-MM-DD (chaînes triables). */
export function isYmdInInclusiveRange(ymd: string, start: string, end: string): boolean {
  return ymd >= start && ymd <= end;
}

export type CalendarQuarter = 1 | 2 | 3 | 4;

/** Trimestre civil (T1 = jan–mar, …), 1er → dernier jour du trimestre. */
export function rangeFullCalendarQuarter(
  year: number,
  quarter: CalendarQuarter
): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start: toLocalYmd(start), end: toLocalYmd(end) };
}

/** Année civile (1er jan → 31 déc). */
export function rangeFullCalendarYear(year: number): { start: string; end: string } {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start: toLocalYmd(start), end: toLocalYmd(end) };
}

/** Plafonne `end` à aujourd'hui si la plage dépasse la date du jour. */
export function capRangeEndToToday(range: { start: string; end: string }): {
  start: string;
  end: string;
} {
  const today = toLocalYmd(new Date());
  if (range.end <= today) {
    return range;
  }
  const end = today < range.start ? range.start : today;
  return { start: range.start, end };
}

/** Nombre de jours calendaires inclus entre deux YYYY-MM-DD. */
export function inclusiveDaysBetween(startYmd: string, endYmd: string): number {
  const start = parseYmdLocal(startYmd);
  const end = parseYmdLocal(endYmd);
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}
