import type { ReactNode } from "react";
import { Button } from "antd";
import { Inbox } from "lucide-react";
import styles from "./ui.module.css";

export function EmptyState({
  title,
  description,
  action,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const control =
    action ??
    (actionLabel && onAction ? (
      <Button type="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null);
  return (
    <div className={styles.state}>
      <Inbox size={28} strokeWidth={1.5} aria-hidden />
      <p className={styles.stateTitle}>{title}</p>
      {description ? <p className={styles.stateText}>{description}</p> : null}
      {control}
    </div>
  );
}
