import styles from "./ui.module.css";

const PLAN_CLASS: Record<string, string> = {
  starter: styles.planStarter,
  pro: styles.planPro,
  business: styles.planBusiness,
};

export function PlanBadge({ slug, name }: { slug?: string | null; name?: string | null }) {
  const label = name?.trim() || slug?.trim();
  if (!label) return <span>—</span>;
  const tone = PLAN_CLASS[(slug ?? name ?? "").toLowerCase()] ?? styles.planStarter;
  return <span className={`${styles.badge} ${tone}`}>{label}</span>;
}
