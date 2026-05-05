import { Bell, CreditCard, FileText, Info, Package, ShoppingCart, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NotificationPresentation = {
  label: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "info";
};

const NOTIFICATION_PRESENTATION: Record<string, NotificationPresentation> = {
  low_stock: { label: "Alertes stock faible", icon: Package, tone: "warning" },
  payment_received: { label: "Paiements reçus", icon: Wallet, tone: "success" },
  sale: { label: "Ventes", icon: ShoppingCart, tone: "success" },
  subscription: { label: "Abonnement — rappels d’échéance", icon: CreditCard, tone: "warning" },
  billing: { label: "Facturation — factures et paiement", icon: FileText, tone: "warning" },
  system: { label: "Système — compte et accueil", icon: Info, tone: "info" },
};

export function getNotificationPresentation(type: string): NotificationPresentation {
  return NOTIFICATION_PRESENTATION[type] ?? { label: type, icon: Bell, tone: "info" };
}

export function getNotificationColor(type: string): string {
  const tone = getNotificationPresentation(type).tone;
  if (tone === "warning") return "var(--color-warning)";
  if (tone === "success") return "var(--color-success)";
  return "var(--color-primary)";
}
