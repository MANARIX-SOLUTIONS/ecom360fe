import { useEffect, useState } from "react";
import { Button, DatePicker, Input } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Search } from "lucide-react";
import type { DatePreset } from "../format/date";
import { useBackofficeI18n } from "../useBackofficePreferences";
import styles from "./ui.module.css";

const PRESETS: DatePreset[] = ["today", "7d", "30d", "month", "lastMonth", "custom"];

const PRESET_KEY: Record<DatePreset, "today" | "d7" | "d30" | "month" | "lastMonth" | "custom"> = {
  today: "today",
  "7d": "d7",
  "30d": "d30",
  month: "month",
  lastMonth: "lastMonth",
  custom: "custom",
};

export type FilterChip = {
  key: string;
  label: string;
};

export function FilterBar({
  search,
  onSearch,
  chips = [],
  onRemoveChip,
  preset,
  onPreset,
  range,
  onRange,
  onReset,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  chips?: FilterChip[];
  onRemoveChip?: (key: string) => void;
  preset?: DatePreset | null;
  onPreset?: (preset: DatePreset) => void;
  range?: [string, string] | null;
  onRange?: (range: [string, string] | null) => void;
  onReset?: () => void;
}) {
  const { t } = useBackofficeI18n();
  const [draft, setDraft] = useState(search ?? "");

  useEffect(() => setDraft(search ?? ""), [search]);

  useEffect(() => {
    if (!onSearch) return;
    const handle = window.setTimeout(() => {
      if (draft !== (search ?? "")) onSearch(draft);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, onSearch, search]);

  const pickerValue: [Dayjs, Dayjs] | null =
    range?.[0] && range?.[1] ? [dayjs(range[0]), dayjs(range[1])] : null;

  return (
    <div className={styles.filterBar}>
      {onSearch ? (
        <Input
          allowClear
          prefix={<Search size={14} strokeWidth={1.75} aria-hidden />}
          placeholder={t.filters.search}
          aria-label={t.filters.search}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ width: 240 }}
        />
      ) : null}
      {onPreset ? (
        <div className={styles.presets} role="group" aria-label={t.filters.custom}>
          {PRESETS.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.preset} ${preset === item ? styles.presetActive : ""}`}
              aria-pressed={preset === item}
              onClick={() => onPreset(item)}
            >
              {t.filters[PRESET_KEY[item]]}
            </button>
          ))}
        </div>
      ) : null}
      {preset === "custom" && onRange ? (
        <DatePicker.RangePicker
          value={pickerValue}
          onChange={(values) => {
            if (!values || !values[0] || !values[1]) {
              onRange(null);
              return;
            }
            onRange([values[0].startOf("day").toISOString(), values[1].endOf("day").toISOString()]);
          }}
        />
      ) : null}
      {chips.length > 0 ? (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <span key={chip.key} className={styles.filterChip}>
              {chip.label}
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={chip.label}
                onClick={() => onRemoveChip?.(chip.key)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {onReset ? (
        <Button type="link" onClick={onReset}>
          {t.filters.reset}
        </Button>
      ) : null}
    </div>
  );
}
