import type { ReactNode } from "react";
import { Typography } from "antd";
import type { LucideIcon } from "lucide-react";
import styles from "./EmptyState.module.css";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Reduced padding — use inside cards or secondary panels */
  compact?: boolean;
};

export function EmptyState({ icon: Icon, title, description, action, compact }: Props) {
  const wrapClass = compact ? `${styles.wrap} ${styles.wrapCompact}` : styles.wrap;
  const iconWrapClass = compact ? `${styles.iconWrap} ${styles.iconWrapCompact}` : styles.iconWrap;
  const iconSize = compact ? 28 : 36;

  return (
    <div className={wrapClass}>
      <div className={iconWrapClass}>
        <Icon size={iconSize} strokeWidth={1.5} aria-hidden />
      </div>
      {compact ? (
        <Typography.Text strong className={styles.titleCompact}>
          {title}
        </Typography.Text>
      ) : (
        <Typography.Title level={4} className={styles.title}>
          {title}
        </Typography.Title>
      )}
      {description ? (
        <Typography.Text type="secondary" className={compact ? styles.descCompact : styles.desc}>
          {description}
        </Typography.Text>
      ) : null}
      {action ? (
        <div className={compact ? styles.actionCompact : styles.action}>{action}</div>
      ) : null}
    </div>
  );
}
