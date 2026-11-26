import { App, Tooltip } from "antd";
import { Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useBackofficeI18n } from "../useBackofficePreferences";
import styles from "./ui.module.css";

export function EntityLink({
  name,
  id,
  href,
}: {
  name?: string | null;
  id?: string | null;
  href?: string;
}) {
  const { notification } = App.useApp();
  const { t } = useBackofficeI18n();
  const label = name?.trim() || t.entity.unknown;
  const copy = async () => {
    if (!id) return;
    await navigator.clipboard.writeText(id);
    notification.success({ message: t.toast.copied, placement: "bottomRight" });
  };
  const content = (
    <span className={styles.entityName} title={id ?? undefined}>
      {label}
    </span>
  );
  return (
    <span className={styles.entity}>
      {href ? <Link to={href}>{content}</Link> : content}
      {id ? (
        <Tooltip title={id}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={t.entity.copyId}
            onClick={copy}
          >
            <Copy size={12} strokeWidth={1.75} />
          </button>
        </Tooltip>
      ) : null}
    </span>
  );
}
