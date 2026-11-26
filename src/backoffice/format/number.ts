const NARROW_SPACE = "\u202F";

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(value))
    .replace(/[\u00A0\u202F\u2009]/g, NARROW_SPACE);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
}
