import type { ReactNode } from "react";
import styles from "./console.module.css";

export function Pill({
  tone,
  children,
}: {
  tone?: "ok" | "warn" | "danger" | "info";
  children: ReactNode;
}) {
  return <span className={`${styles.pill} ${tone ? styles[tone] : ""}`}>{children}</span>;
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalBack}>
      <button type="button" className={styles.scrim} aria-label="Fermer" onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.errorBox}>
      <strong>Impossible de charger cette vue</strong>
      <p>La source des indicateurs n'a pas répondu. Aucun chiffre de remplacement n'est affiché.</p>
      <button type="button" className={styles.btn} onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}

export function Denied({ moduleName }: { moduleName: string }) {
  return (
    <div className={styles.errorBox}>
      <strong>Accès refusé</strong>
      <p>
        Le module « {moduleName} » n'est pas ouvert pour ce rôle. Demandez un accès à un super admin
        si vous en avez besoin.
      </p>
    </div>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 24 - ((value - min) / span) * 20;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={styles.spark} viewBox="0 0 100 28" width="100%" height="28" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}
