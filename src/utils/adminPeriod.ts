export type AdminPeriodKey = "today" | "7d" | "30d" | "90d" | "12m" | "custom";

const PERIOD_KEYS: AdminPeriodKey[] = ["today", "7d", "30d", "90d", "12m", "custom"];

export function parseAdminPeriodKey(
  value: string | null | undefined,
  fallback: AdminPeriodKey = "30d"
): AdminPeriodKey {
  return PERIOD_KEYS.includes(value as AdminPeriodKey) ? (value as AdminPeriodKey) : fallback;
}

export type AdminPeriodRange = {
  key: AdminPeriodKey;
  from: string;
  to: string;
};

export function startOfLocalDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function resolveAdminPeriod(
  key: AdminPeriodKey,
  customFrom?: Date,
  customTo?: Date
): AdminPeriodRange {
  const to = new Date();
  if (key === "custom" && customFrom && customTo) {
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);
    return { key, from: customFrom.toISOString(), to: end.toISOString() };
  }
  const from = startOfLocalDay();
  if (key === "7d") from.setDate(from.getDate() - 6);
  else if (key === "30d") from.setDate(from.getDate() - 29);
  else if (key === "90d") from.setDate(from.getDate() - 89);
  else if (key === "12m") from.setDate(from.getDate() - 364);
  return { key, from: from.toISOString(), to: to.toISOString() };
}

export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `Il y a ${days} j`;
}
