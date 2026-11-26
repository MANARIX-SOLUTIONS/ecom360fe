import { App, Tooltip } from "antd";
import { Copy } from "lucide-react";
import { useBackofficeI18n } from "../useBackofficePreferences";
import styles from "./ui.module.css";

export function CopyableId({
  value,
  length = 8,
}: {
  value: string | null | undefined;
  length?: number;
}) {
  const { notification } = App.useApp();
  const { t } = useBackofficeI18n();
  if (!value) return <span>—</span>;
  const short = value.length > length ? `${value.slice(0, length)}…` : value;
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    notification.success({ message: t.toast.copied, placement: "bottomRight" });
  };
  return (
    <Tooltip title={value}>
      <span className={styles.chip}>
        <span className={styles.chipValue}>{short}</span>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={t.entity.copyId}
          onClick={copy}
        >
          <Copy size={12} strokeWidth={1.75} />
        </button>
      </span>
    </Tooltip>
  );
}
