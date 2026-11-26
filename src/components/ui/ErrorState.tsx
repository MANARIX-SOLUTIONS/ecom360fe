import { Button, Typography } from "antd";
import { AlertCircle } from "lucide-react";
import styles from "./merchantUi.module.css";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Impossible de charger les données",
  description = "Vérifiez votre connexion puis réessayez.",
  onRetry,
}: Props) {
  return (
    <div className={styles.errorState} role="alert">
      <span className={styles.errorIcon} aria-hidden>
        <AlertCircle size={22} />
      </span>
      <Typography.Title level={4} className={styles.errorTitle}>
        {title}
      </Typography.Title>
      <Typography.Text type="secondary" className={styles.errorDesc}>
        {description}
      </Typography.Text>
      {onRetry ? (
        <Button type="primary" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
