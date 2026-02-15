import { CloudOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import styles from "./OfflineBanner.module.css";

/**
 * Sticky banner shown when the user is offline.
 * Visible across all pages to inform users that data may not sync.
 */
export function OfflineBanner() {
  const { offline } = useNetworkStatus();

  if (!offline) return null;

  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <CloudOff size={18} className={styles.icon} aria-hidden />
      <span>
        Vous êtes hors ligne. Les modifications seront synchronisées à la reconnexion.
      </span>
    </div>
  );
}
