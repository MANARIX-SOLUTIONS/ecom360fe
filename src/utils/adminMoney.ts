const DEFAULT_CURRENCY = "XOF";

export function formatAdminMoney(
  value: number | null | undefined,
  currency = DEFAULT_CURRENCY
): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
  if (currency === "XOF" || currency === "CFA") {
    return `${formatted} F CFA`;
  }
  return `${formatted} ${currency}`;
}

export function formatAdminPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
}

export function formatAdminRate(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(1)} %`;
}

/** Failed intents over all intents created in the period. Null when no attempts. */
export function failedPaymentRate(
  failedCount: number | null | undefined,
  attemptsCount: number | null | undefined
): number | null {
  if (failedCount == null || attemptsCount == null || attemptsCount <= 0) {
    return null;
  }
  return (failedCount / attemptsCount) * 100;
}

export function periodDelta(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}
