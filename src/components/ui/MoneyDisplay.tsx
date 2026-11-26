import { formatFCFA } from "@/utils/money";
import styles from "./merchantUi.module.css";

type Props = {
  value: number | null | undefined;
  className?: string;
};

export function MoneyDisplay({ value, className }: Props) {
  return <span className={`${styles.money} amount ${className ?? ""}`}>{formatFCFA(value)}</span>;
}
