import { useEffect, useState } from "react";
import { Tooltip } from "antd";
import { ArrowDown, ArrowUp, CircleHelp, Minus } from "lucide-react";
import { formatPercent } from "../format/number";
import { useBackofficeI18n } from "../useBackofficePreferences";
import { SkeletonKpi } from "./Skeleton";
import styles from "./ui.module.css";

function useCountUp(target: number | null | undefined) {
  const [shown, setShown] = useState(target ?? 0);
  useEffect(() => {
    if (target == null || !Number.isFinite(target)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 500);
      const eased = 1 - (1 - progress) ** 3;
      setShown(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

export function KpiCard({
  label,
  value,
  numericValue,
  formatValue,
  delta,
  hint,
  caption,
  series,
  loading,
  tone,
}: {
  label: string;
  value?: string;
  numericValue?: number | null;
  formatValue?: (value: number) => string;
  delta?: number | null;
  hint?: string;
  caption?: string;
  series?: number[];
  loading?: boolean;
  tone?: "danger";
}) {
  const { t } = useBackofficeI18n();
  const animated = useCountUp(numericValue);
  if (loading) return <SkeletonKpi />;
  const display =
    numericValue != null && formatValue ? formatValue(Math.round(animated)) : (value ?? "—");
  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  const deltaClass =
    delta == null || delta === 0 ? styles.flat : delta > 0 ? styles.up : styles.down;
  return (
    <article className={styles.kpi}>
      <div className={styles.kpiHead}>
        <span>{label}</span>
        {hint ? (
          <Tooltip title={hint}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={`${t.kpi.definition} : ${label}`}
            >
              <CircleHelp size={14} strokeWidth={1.75} />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <div
        className={styles.kpiValue}
        style={tone === "danger" ? { color: "var(--danger)" } : undefined}
      >
        {display}
      </div>
      {caption ? <p className={styles.kpiCaption}>{caption}</p> : null}
      <div className={styles.kpiMeta}>
        {delta != null ? (
          <span className={`${styles.delta} ${deltaClass}`}>
            <DeltaIcon size={12} strokeWidth={1.75} aria-hidden />
            <span>
              {t.kpi.delta} {formatPercent(delta)}
            </span>
          </span>
        ) : (
          <span />
        )}
        {series && series.length > 1 ? <Sparkline values={series} /> : null}
      </div>
    </article>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 88;
      const y = 26 - ((value - min) / span) * 22;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={styles.spark} viewBox="0 0 88 28" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" points={points} />
    </svg>
  );
}
