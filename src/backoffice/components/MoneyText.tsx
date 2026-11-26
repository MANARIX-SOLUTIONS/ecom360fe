import { formatMoney } from "../format/money";
import styles from "./ui.module.css";

export function MoneyText({
  value,
  currency = "XOF",
}: {
  value: number | null | undefined;
  currency?: string;
}) {
  return <span className={styles.nums}>{formatMoney(value, currency)}</span>;
}
