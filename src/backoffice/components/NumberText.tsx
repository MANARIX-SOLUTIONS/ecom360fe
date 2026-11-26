import { formatNumber } from "../format/number";
import styles from "./ui.module.css";

export function NumberText({ value }: { value: number | null | undefined }) {
  return <span className={styles.nums}>{formatNumber(value)}</span>;
}
