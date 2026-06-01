import {
  inclusiveDaysBetween,
  parseYmdLocal,
  toLocalYmd,
  ymdFromIsoLocal,
} from "@/utils/dateLocal";

export type SalesChartPoint = { name: string; ventes: number; dépenses: number };

function mondayWeekStartYmd(ymd: string): string {
  const d = parseYmdLocal(ymd);
  const day = d.getDay();
  const offset = (day + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  return toLocalYmd(monday);
}

function formatDayLabel(ymd: string): string {
  return ymd.slice(5);
}

function formatWeekLabel(weekStartYmd: string): string {
  const d = parseYmdLocal(weekStartYmd);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatMonthLabel(monthKey: string): string {
  const d = parseYmdLocal(`${monthKey}-01`);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

type BucketMode = "day" | "week" | "month";

function bucketModeForRange(periodStart: string, periodEnd: string): BucketMode {
  const days = inclusiveDaysBetween(periodStart, periodEnd);
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

function bucketKey(ymd: string, mode: BucketMode): string {
  if (mode === "day") return ymd;
  if (mode === "week") return mondayWeekStartYmd(ymd);
  return ymd.slice(0, 7);
}

function bucketLabel(key: string, mode: BucketMode): string {
  if (mode === "day") return formatDayLabel(key);
  if (mode === "week") return formatWeekLabel(key);
  return formatMonthLabel(key);
}

/** Agrège les ventes pour le graphique barres selon la durée de la période. */
export function buildSalesChartData(
  sales: { createdAt: string; total: number }[],
  periodStart: string,
  periodEnd: string
): SalesChartPoint[] {
  if (!sales.length) return [];
  const mode = bucketModeForRange(periodStart, periodEnd);
  const byBucket: Record<string, { ventes: number; dépenses: number }> = {};
  for (const s of sales) {
    const dayYmd = ymdFromIsoLocal(s.createdAt);
    const key = bucketKey(dayYmd, mode);
    if (!byBucket[key]) byBucket[key] = { ventes: 0, dépenses: 0 };
    byBucket[key].ventes += s.total;
  }
  return Object.entries(byBucket)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ name: bucketLabel(key, mode), ...v }));
}
