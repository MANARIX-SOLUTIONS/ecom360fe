import type { ReactNode } from "react";
import { Typography } from "antd";
import styles from "./backofficeUi.module.css";

type Props = {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
};

export function PageHeader({ title, subtitle, extra }: Props) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <Typography.Title level={2} className={styles.pageTitle}>
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Text type="secondary" className={styles.pageSubtitle}>
            {subtitle}
          </Typography.Text>
        ) : null}
      </div>
      {extra ? <div className={styles.pageHeaderExtra}>{extra}</div> : null}
    </div>
  );
}
