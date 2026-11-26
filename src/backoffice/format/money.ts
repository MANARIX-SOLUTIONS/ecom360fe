const NARROW_SPACE = "\u202F";

export function formatMoney(value: number | null | undefined, currency = "XOF"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const grouped = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  })
    .format(Math.round(value))
    .replace(/[\u00A0\u202F\u2009]/g, NARROW_SPACE);
  if (currency === "XOF" || currency === "CFA") {
    return `${grouped} F CFA`;
  }
  return `${grouped} ${currency}`;
}
