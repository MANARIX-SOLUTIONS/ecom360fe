import type { ReactNode } from "react";
import { Typography } from "antd";
import styles from "./merchantUi.module.css";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  extra?: ReactNode;
};

export function PageHeader({ title, subtitle, eyebrow, extra }: Props) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageTitleBlock}>
        {eyebrow ? <span className={styles.pageEyebrow}>{eyebrow}</span> : null}
        <Typography.Title level={2} className={styles.pageTitle}>
          {title}
        </Typography.Title>
        {subtitle ? <span className={styles.pageSubtitle}>{subtitle}</span> : null}
      </div>
      {extra ? <div className={styles.pageHeaderExtra}>{extra}</div> : null}
    </header>
  );
}
