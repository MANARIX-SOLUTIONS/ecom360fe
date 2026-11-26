import type { LucideIcon } from "lucide-react";
import { Card, Tooltip, Typography } from "antd";
import { CircleHelp } from "lucide-react";
import { formatAdminPercent } from "@/utils/adminMoney";
import styles from "./backofficeUi.module.css";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  onOpen?: () => void;
  delta?: number | null;
  footnote?: string;
};

export function KpiCard({ label, value, hint, icon: Icon, href, onOpen, delta, footnote }: Props) {
  const interactive = Boolean(href || onOpen);
  return (
    <Card
      variant="borderless"
      className={styles.kpiCard}
      hoverable={interactive}
      onClick={onOpen}
      role={interactive ? "link" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon} aria-hidden>
          <Icon size={18} />
        </span>
        {hint ? (
          <Tooltip title={hint}>
            <button type="button" className={styles.kpiHint} aria-label={`Définition : ${label}`}>
              <CircleHelp size={14} />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabelRow}>
        <span className={styles.kpiLabel}>{label}</span>
        {delta != null ? (
          <Typography.Text
            className={delta >= 0 ? styles.kpiUp : styles.kpiDown}
            aria-label={`Variation ${formatAdminPercent(delta)}`}
          >
            {formatAdminPercent(delta)}
          </Typography.Text>
        ) : null}
      </div>
      {footnote ? <div className={styles.kpiFootnote}>{footnote}</div> : null}
    </Card>
  );
}
