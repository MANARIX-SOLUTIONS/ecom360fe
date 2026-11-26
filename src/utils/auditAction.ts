const LABELS: Record<string, string> = {
  LOGIN: "Connexion",
  REGISTER: "Inscription",
  DEMO_REQUEST: "Demande de démo",
  DEMO_REQUEST_APPROVED: "Démo validée",
  DEMO_REQUEST_REJECTED: "Démo refusée",
  PASSWORD_CHANGE: "Changement mot de passe",
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  FEATURE_FLAG_UPDATED: "Indicateur modifié",
  FEATURE_FLAG_UPDATE: "Indicateur modifié",
  "subscription.checkout.created": "Checkout d'abonnement créé",
  "subscription.payment.paid": "Paiement d'abonnement confirmé",
  LANDING_STATUS_UPDATED: "Landing mise à jour",
  SUBSCRIPTION_RENEWED: "Abonnement renouvelé",
  PLAN_ASSIGNED: "Plan assigné",
  PLAN_UPDATED: "Plan modifié",
  BUSINESS_FEATURES_UPDATED: "Fonctionnalités entreprise modifiées",
  BUSINESS_SUSPENDED: "Entreprise suspendue",
  BUSINESS_REACTIVATED: "Entreprise réactivée",
  USER_DISABLED: "Utilisateur désactivé",
  USER_REACTIVATED: "Utilisateur réactivé",
  PASSWORD_RESET_SENT: "Récupération de compte envoyée",
  PAYMENT_MARKED_PAID: "Paiement confirmé manuellement",
};

export function formatAuditAction(action: string): string {
  return LABELS[action] ?? action;
}
