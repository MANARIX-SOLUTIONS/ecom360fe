import { useBackofficeI18n } from "../useBackofficePreferences";
import styles from "./ui.module.css";

const CLASS_BY_TYPE: Record<string, string> = {
  commerce: styles.typeCommerce,
  prestations: styles.typePrestations,
  vendeur_independant: styles.typeVendeur,
};

export function BusinessTypeBadge({ type }: { type?: string | null }) {
  const { t } = useBackofficeI18n();
  if (!type) return null;
  const key = type.toLowerCase();
  const label =
    key === "commerce" || key === "prestations" || key === "vendeur_independant"
      ? t.badges[key]
      : type;
  return <span className={`${styles.badge} ${CLASS_BY_TYPE[key] ?? styles.neutral}`}>{label}</span>;
}
