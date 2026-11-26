import { Button } from "antd";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({
  title = "Impossible de charger les données",
  description = "Vérifiez votre connexion, puis réessayez.",
  onRetry,
  compact,
}: Props) {
  return (
    <EmptyState
      compact={compact}
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            Réessayer
          </Button>
        ) : undefined
      }
    />
  );
}
