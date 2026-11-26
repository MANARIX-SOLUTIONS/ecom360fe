import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Ban, Check, CircleDashed, Clock, Minus, X } from "lucide-react";
import { useBackofficeI18n } from "../useBackofficePreferences";
import styles from "./ui.module.css";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<string, BadgeTone> = {
  active: "success",
  approved: "success",
  converted: "success",
  paid: "success",
  healthy: "success",
  pending: "info",
  initiated: "info",
  trial: "info",
  trialing: "info",
  open: "info",
  past_due: "warning",
  paused: "warning",
  incomplete: "warning",
  expired: "warning",
  degraded: "warning",
  urgent: "danger",
  suspended: "danger",
  rejected: "danger",
  failed: "danger",
  down: "danger",
  disabled: "danger",
  cancelled: "neutral",
  refunded: "neutral",
  draft: "neutral",
  void: "neutral",
  unknown: "neutral",
  inactive: "neutral",
};

const ICON: Record<BadgeTone, LucideIcon> = {
  success: Check,
  warning: AlertTriangle,
  danger: X,
  info: Clock,
  neutral: Minus,
};

const SPECIAL_ICON: Record<string, LucideIcon> = {
  suspended: Ban,
  unknown: CircleDashed,
  pending: Clock,
};

type BadgeKey = keyof ReturnType<typeof useBackofficeI18n>["t"]["badges"];

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useBackofficeI18n();
  if (!status) return <span className={styles.nums}>—</span>;
  const key = status.toLowerCase();
  const tone = TONE[key] ?? "neutral";
  const Icon = SPECIAL_ICON[key] ?? ICON[tone];
  const known = key in t.badges;
  const label = known ? t.badges[key as BadgeKey] : status;
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      {label}
    </span>
  );
}
