import type { LucideIcon } from "lucide-react";
import { Card, Tooltip, Typography } from "antd";
import { CircleHelp } from "lucide-react";
import styles from "./merchantUi.module.css";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  onOpen?: () => void;
  delta?: number | null;
  footnote?: string;
};

export function KpiCard({ label, value, hint, icon: Icon, onOpen, delta, footnote }: Props) {
  const interactive = Boolean(onOpen);
  return (
    <Card
      variant="borderless"
      className={styles.kpiCard}
      hoverable={interactive}
      onClick={onOpen}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className={styles.kpiInner}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiIcon} aria-hidden>
            <Icon size={16} />
          </span>
          {hint ? (
            <Tooltip title={hint}>
              <button type="button" className={styles.kpiHint} aria-label={`Définition : ${label}`}>
                <CircleHelp size={14} />
              </button>
            </Tooltip>
          ) : null}
        </div>
        <div className={`${styles.kpiValue} amount`}>{value}</div>
        <div className={styles.kpiLabelRow}>
          <span className={styles.kpiLabel}>{label}</span>
          {delta != null ? (
            <Typography.Text
              className={delta >= 0 ? styles.kpiUp : styles.kpiDown}
              aria-label={`Variation ${delta > 0 ? "+" : ""}${delta} %`}
            >
              {delta > 0 ? "+" : ""}
              {delta}%
            </Typography.Text>
          ) : null}
        </div>
        {footnote ? <div className={styles.kpiFootnote}>{footnote}</div> : null}
      </div>
    </Card>
  );
}
