import { Select } from "antd";
import { LayoutGrid } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { t } from "@/i18n";
import styles from "./StoreScopeSelect.module.css";

const ALL_STORES_VALUE = "__all__";

export type StoreScopeSelectProps = {
  value: string | null;
  onChange: (storeId: string | null) => void;
  /** onDark = hero VueGlobale ; default = toolbar Rapports */
  variant?: "onDark" | "default";
};

export function StoreScopeSelect({ value, onChange, variant = "default" }: StoreScopeSelectProps) {
  const { stores, loading } = useStore();

  if (loading || stores.length <= 1) {
    return null;
  }

  const options = [
    { value: ALL_STORES_VALUE, label: t.globalView.storeSelectorAll },
    ...stores.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className={`${styles.wrap} ${styles[variant]}`}>
      <LayoutGrid size={16} className={styles.icon} aria-hidden />
      <Select
        value={value ?? ALL_STORES_VALUE}
        onChange={(v) => onChange(v === ALL_STORES_VALUE ? null : v)}
        options={options}
        className={styles.select}
        popupMatchSelectWidth={false}
        aria-label={t.globalView.storeSelectorAria}
      />
    </div>
  );
}
