import { Button } from "antd";
import { useBackofficeI18n } from "../useBackofficePreferences";
import { EmptyState } from "./EmptyState";

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useBackofficeI18n();
  return (
    <EmptyState
      title={title ?? t.states.errorTitle}
      description={description}
      action={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            {t.states.retry}
          </Button>
        ) : null
      }
    />
  );
}
