import { Select } from "antd";
import { type PeriodKey } from "@/utils/period";
import styles from "./merchantUi.module.css";

const OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "7d", label: "7 derniers jours" },
  { value: "month", label: "Ce mois" },
  { value: "lastMonth", label: "Mois dernier" },
];

type Props = {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  disabled?: boolean;
};

export function PeriodFilter({ value, onChange, disabled }: Props) {
  return (
    <Select
      className={styles.periodFilter}
      value={value}
      disabled={disabled}
      options={OPTIONS}
      onChange={(next) => onChange(next)}
      aria-label="Période d'analyse"
    />
  );
}
