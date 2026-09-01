import type { ReactNode } from "react";
import { Typography } from "antd";
import { ArrowLeft } from "lucide-react";
import { t } from "@/i18n";
import styles from "./PageHeader.module.css";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
};

export function PageHeader({
  title,
  subtitle,
  meta,
  actions,
  onBack,
  backLabel,
}: Props) {
  return (
    <header className={`pageHeader ${styles.header}`}>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={18} aria-hidden />
          {backLabel ?? t.common.back}
        </button>
      ) : null}
      <div className={styles.row}>
        <div className={styles.lead}>
          <Typography.Title level={2} className={`pageTitle ${styles.title}`}>
            {title}
          </Typography.Title>
          {subtitle ? (
            <p className={`pageSubtitle ${styles.subtitle}`}>{subtitle}</p>
          ) : null}
          {meta ? <div className={styles.meta}>{meta}</div> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}
