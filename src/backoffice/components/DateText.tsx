import { Tooltip } from "antd";
import { formatDate, formatDateTime, formatRelative } from "../format/date";
import { useBackofficeI18n } from "../useBackofficePreferences";
import styles from "./ui.module.css";

export function DateText({
  value,
  mode = "relative",
}: {
  value: string | Date | null | undefined;
  mode?: "relative" | "date" | "datetime";
}) {
  const { locale } = useBackofficeI18n();
  if (value == null || value === "") return <span>—</span>;
  const absolute = formatDateTime(value);
  if (mode === "date") return <span className={styles.nums}>{formatDate(value)}</span>;
  if (mode === "datetime") return <span className={styles.nums}>{absolute}</span>;
  return (
    <Tooltip title={absolute}>
      <span className={styles.nums}>{formatRelative(value, new Date(), locale)}</span>
    </Tooltip>
  );
}
