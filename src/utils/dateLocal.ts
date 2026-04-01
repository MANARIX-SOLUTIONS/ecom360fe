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

/** Compare deux dates YYYY-MM-DD (chaînes triables). */
export function isYmdInInclusiveRange(ymd: string, start: string, end: string): boolean {
  return ymd >= start && ymd <= end;
}
