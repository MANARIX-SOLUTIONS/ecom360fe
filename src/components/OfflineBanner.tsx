import { CloudOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSaleOutbox } from "@/hooks/useSaleOutbox";
import { t } from "@/i18n";
import styles from "./OfflineBanner.module.css";

/**
 * Sticky banner shown when the user is offline.
 * Visible across all pages to inform users that data may not sync.
 */
export function OfflineBanner() {
  const { offline } = useNetworkStatus();
  const { pendingCount } = useSaleOutbox();

  if (!offline) return null;

  const label =
    pendingCount > 0
      ? t.pos.offlineBannerPending.replace("{count}", String(pendingCount))
      : "Vous êtes hors ligne. Les modifications seront synchronisées à la reconnexion.";

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <CloudOff size={18} className={styles.icon} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
