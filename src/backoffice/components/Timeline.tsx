import type { LucideIcon } from "lucide-react";
import { Circle } from "lucide-react";
import { DateText } from "./DateText";
import styles from "./ui.module.css";

export type TimelineEntry = {
  id: string;
  actor: string;
  action: string;
  target?: string | null;
  at: string;
  icon?: LucideIcon;
};

export function Timeline({ items }: { items: TimelineEntry[] }) {
  return (
    <ol className={styles.timeline}>
      {items.map((item) => {
        const Icon = item.icon ?? Circle;
        return (
          <li key={item.id} className={styles.timelineItem}>
            <span className={styles.timelineIcon}>
              <Icon size={14} strokeWidth={1.75} aria-hidden />
            </span>
            <div className={styles.timelineBody}>
              <p className={styles.timelineAction}>
                <strong>{item.actor}</strong> {item.action}
                {item.target ? ` · ${item.target}` : ""}
              </p>
              <p className={styles.timelineMeta}>
                <DateText value={item.at} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
