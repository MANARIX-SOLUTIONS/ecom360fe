import { useNavigate } from "react-router-dom";
import { Dropdown } from "antd";
import { Store, ChevronDown, Plus } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { t } from "@/i18n";
import styles from "./StoreSwitcher.module.css";

export function StoreSwitcher() {
  const navigate = useNavigate();
  const { stores, activeStore, setActiveStoreId, hasStores } = useStore();

  const menuItems = [
    ...stores.map((s) => ({
      key: s.id,
      label: s.name,
      onClick: () => setActiveStoreId(s.id),
    })),
    { type: "divider" as const },
    {
      key: "manage",
      label: t.stores.manageStores,
      icon: <Plus size={14} />,
      onClick: () => navigate("/settings/stores"),
    },
  ];

  if (!hasStores) {
    return (
      <button type="button" className={styles.trigger} onClick={() => navigate("/settings/stores")}>
        <Store size={18} />
        <span>{t.stores.addFirst}</span>
        <ChevronDown size={16} />
      </button>
    );
  }

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomLeft">
      <button type="button" className={styles.trigger}>
        <Store size={18} />
        <span className={styles.triggerName}>{activeStore?.name ?? t.stores.selectStore}</span>
        <ChevronDown size={16} />
      </button>
    </Dropdown>
  );
}
