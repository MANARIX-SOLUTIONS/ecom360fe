import type { ReactNode } from "react";
import styles from "./backofficeUi.module.css";

type Props = {
  children: ReactNode;
  extra?: ReactNode;
};

export function FilterBar({ children, extra }: Props) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterBarLeft}>{children}</div>
      {extra ? <div className={styles.filterBarRight}>{extra}</div> : null}
    </div>
  );
}
