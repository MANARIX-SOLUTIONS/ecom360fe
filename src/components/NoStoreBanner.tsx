import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import { Store, ArrowRight } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import styles from "./NoStoreBanner.module.css";

export function NoStoreBanner() {
  const navigate = useNavigate();
  const { hasStores } = useStore();

  if (hasStores) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          <Store size={24} />
        </div>
        <div className={styles.content}>
          <span className={styles.title}>Créez votre première boutique</span>
          <span className={styles.desc}>
            Configurez votre point de vente pour commencer à enregistrer des ventes et suivre vos
            stocks.
          </span>
        </div>
        <Button
          type="primary"
          size="large"
          className={styles.cta}
          onClick={() => navigate("/settings/stores")}
        >
          Créer ma boutique
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
