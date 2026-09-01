import { Typography } from "antd";
import { CloudOff } from "lucide-react";
import { t } from "@/i18n";
import styles from "./SyncIndicator.module.css";

type Props = { syncing?: boolean; offline?: boolean; pendingCount?: number };

export function SyncIndicator({ syncing, offline, pendingCount = 0 }: Props) {
  if (!syncing && !offline && pendingCount <= 0) return null;
  const pendingLabel = t.pos.pendingSales.replace("{count}", String(pendingCount));
  return (
    <span className={styles.wrapper} role="status">
      {pendingCount > 0 ? (
        <>
          {offline ? (
            <CloudOff size={14} className={styles.offline} />
          ) : (
            <span className={styles.dot} />
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {pendingLabel}
          </Typography.Text>
        </>
      ) : offline ? (
        <CloudOff size={14} className={styles.offline} />
      ) : (
        <>
          <span className={styles.dot} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t.pos.sync}
          </Typography.Text>
        </>
      )}
    </span>
  );
}
