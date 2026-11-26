export type AdminStatusTone = "success" | "warning" | "error" | "processing" | "default";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
  converted: "Convertie",
  active: "Actif",
  suspended: "Suspendu",
  trial: "Essai",
  trialing: "Essai",
  expired: "Expiré",
  cancelled: "Annulé",
  past_due: "Impayé",
  paused: "En pause",
  incomplete: "Incomplet",
  paid: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
  draft: "Brouillon",
  void: "Annulée",
  healthy: "Sain",
  degraded: "Dégradé",
  down: "Indisponible",
  unknown: "Inconnu",
  disabled: "Désactivé",
  inactive: "Inactif",
};

const STATUS_TONES: Record<string, AdminStatusTone> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
  converted: "success",
  active: "success",
  paid: "success",
  healthy: "success",
  suspended: "error",
  failed: "error",
  down: "error",
  disabled: "error",
  trial: "processing",
  trialing: "processing",
  expired: "warning",
  cancelled: "default",
  past_due: "warning",
  paused: "warning",
  incomplete: "warning",
  refunded: "default",
  degraded: "warning",
  unknown: "default",
  draft: "default",
  void: "default",
  inactive: "default",
};

export function adminStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

export function adminStatusTone(status: string | null | undefined): AdminStatusTone {
  if (!status) return "default";
  return STATUS_TONES[status] ?? "default";
}
