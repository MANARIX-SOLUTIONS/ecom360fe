import { Typography } from "antd";
import { CloudOff } from "lucide-react";
import { t } from "@/i18n";
import styles from "./SyncIndicator.module.css";

type Props = { syncing?: boolean; offline?: boolean };

export function SyncIndicator({ syncing, offline }: Props) {
  if (!syncing && !offline) return null;
  return (
    <span className={styles.wrapper} role="status">
      {offline ? (
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
