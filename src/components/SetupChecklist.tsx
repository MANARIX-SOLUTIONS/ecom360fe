import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Progress } from "antd";
import { Store, Package, ShoppingCart, Users, ChevronRight, CheckCircle } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import styles from "./SetupChecklist.module.css";

type Step = {
  key: string;
  icon: typeof Store;
  title: string;
  desc: string;
  path: string;
  done: boolean;
};

type SetupChecklistProps = {
  hasProducts?: boolean;
  hasFirstSale?: boolean;
  hasClients?: boolean;
};

export function SetupChecklist({
  hasProducts = false,
  hasFirstSale = false,
  hasClients = false,
}: SetupChecklistProps) {
  const navigate = useNavigate();
  const { hasStores } = useStore();

  const steps: Step[] = useMemo(
    () => [
      {
        key: "store",
        icon: Store,
        title: "Créer votre boutique",
        desc: "Ajoutez votre premier point de vente",
        path: "/settings/stores",
        done: hasStores,
      },
      {
        key: "product",
        icon: Package,
        title: "Ajouter des produits",
        desc: "Importez ou créez votre catalogue",
        path: "/products",
        done: hasProducts,
      },
      {
        key: "sale",
        icon: ShoppingCart,
        title: "Effectuer une vente",
        desc: "Testez le point de vente",
        path: "/pos",
        done: hasFirstSale,
      },
      {
        key: "client",
        icon: Users,
        title: "Ajouter un client",
        desc: "Commencez à suivre les crédits",
        path: "/clients",
        done: hasClients,
      },
    ],
    [hasStores, hasProducts, hasFirstSale, hasClients]
  );

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = Math.round((completed / total) * 100);

  // If all done, don't show the checklist
  if (completed >= total) return null;

  return (
    <Card bordered={false} className={styles.card}>
      <div className={styles.header}>
        <div>
          <Typography.Text strong className={styles.title}>
            Configurez votre commerce
          </Typography.Text>
          <Typography.Text type="secondary" className={styles.subtitle}>
            {completed}/{total} étapes complétées
          </Typography.Text>
        </div>
        <Progress
          type="circle"
          percent={percent}
          size={48}
          strokeWidth={8}
          strokeColor="var(--color-primary)"
          format={() => `${completed}/${total}`}
        />
      </div>
      <div className={styles.steps}>
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              type="button"
              className={`${styles.step} ${step.done ? styles.stepDone : ""}`}
              onClick={() => !step.done && navigate(step.path)}
              disabled={step.done}
            >
              <span className={`${styles.stepIcon} ${step.done ? styles.stepIconDone : ""}`}>
                {step.done ? <CheckCircle size={18} /> : <Icon size={18} />}
              </span>
              <span className={styles.stepContent}>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepDesc}>{step.desc}</span>
              </span>
              {!step.done && <ChevronRight size={16} className={styles.stepChevron} />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
