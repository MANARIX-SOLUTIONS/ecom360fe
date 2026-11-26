export type PlanId = "starter" | "pro" | "business";

export type TenantStatus = "essai" | "actif" | "impaye" | "suspendu" | "resilie" | "demo";

export type Mode = "Commerce" | "Prestations" | "Vendeur";

export type RoleId = "super_admin" | "finance" | "support" | "sales" | "lecture";

export type PaymentStatus = "initie" | "en_attente" | "reussi" | "echoue" | "rembourse" | "expire";

export type PaymentChannel = "Wave" | "Orange Money" | "Carte" | "Virement" | "Espèces" | "Manuel";

export type Tenant = {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  sector: string;
  modes: Mode[];
  plan: PlanId;
  cycle: "mensuel" | "annuel";
  status: TenantStatus;
  isDemo: boolean;
  renewal: string;
  stores: number;
  users: number;
  gmv30: number;
  lastActivity: string;
  createdAt: string;
  salesMonth: number;
  products: number;
  openTickets: number;
};

export type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  plan: PlanId;
  channel: PaymentChannel;
  status: PaymentStatus;
  at: string;
  ref: string;
  invoice: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  actorType: "staff" | "marchand" | "systeme";
  action: string;
  target: string;
  tenantId: string | null;
  tenantName: string;
  ip: string;
  country: string;
  severity: "info" | "attention" | "critique";
  requestId: string;
  userAgent: string;
  before?: string;
  after?: string;
};

export type DemoLead = {
  id: string;
  business: string;
  sector: string;
  mode: Mode;
  city: string;
  phone: string;
  source: string;
  stage: "nouvelle" | "contactee" | "demo" | "essai" | "converti" | "perdu";
  owner: string;
};

export type ServiceHealth = {
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  detail: string;
};

export const PLAN_PRICE: Record<PlanId, number> = {
  starter: 15000,
  pro: 25000,
  business: 35000,
};

export const PLAN_LABEL: Record<PlanId, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

export const PLAN_LIMITS: Record<
  PlanId,
  { sales: number; products: number; users: number; stores: number }
> = {
  starter: { sales: 300, products: 200, users: 2, stores: 1 },
  pro: { sales: 1500, products: 2000, users: 5, stores: 3 },
  business: { sales: 8000, products: 20000, users: 20, stores: 8 },
};

export type FeatureId =
  | "expenses"
  | "reports"
  | "advanced_reports"
  | "multi_payment"
  | "export_pdf"
  | "export_excel"
  | "client_credits"
  | "supplier_tracking"
  | "role_management"
  | "api"
  | "custom_branding"
  | "priority_support"
  | "account_manager"
  | "stock_alerts"
  | "delivery_couriers"
  | "global_view"
  | "pos_online_payment";

export type ProductFeature = {
  id: FeatureId;
  label: string;
  description: string;
  plans: Record<PlanId, boolean>;
};

const S = false;
const P = true;

export const FEATURES: ProductFeature[] = [
  {
    id: "expenses",
    label: "Dépenses",
    description: "Saisie et suivi des dépenses",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "reports",
    label: "Rapports",
    description: "Rapports de ventes",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "advanced_reports",
    label: "Rapports avancés",
    description: "Marges, comparaisons et exports analytiques",
    plans: { starter: S, pro: S, business: P },
  },
  {
    id: "multi_payment",
    label: "Paiements multiples",
    description: "Plusieurs moyens sur une même vente",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "export_pdf",
    label: "Export PDF",
    description: "Tickets et documents PDF",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "export_excel",
    label: "Export Excel",
    description: "Exports tableur",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "client_credits",
    label: "Crédits clients",
    description: "Ventes à crédit et encours",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "supplier_tracking",
    label: "Suivi fournisseurs",
    description: "Dettes et livraisons fournisseurs",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "role_management",
    label: "Gestion des rôles",
    description: "Rôles et permissions de l'équipe",
    plans: { starter: S, pro: S, business: P },
  },
  {
    id: "api",
    label: "API",
    description: "Clés API et webhooks",
    plans: { starter: S, pro: S, business: P },
  },
  {
    id: "custom_branding",
    label: "Marque personnalisée",
    description: "Logo et couleurs sur les documents",
    plans: { starter: S, pro: S, business: P },
  },
  {
    id: "priority_support",
    label: "Support prioritaire",
    description: "File de support prioritaire",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "account_manager",
    label: "Account manager",
    description: "Interlocuteur dédié",
    plans: { starter: S, pro: S, business: P },
  },
  {
    id: "stock_alerts",
    label: "Alertes de stock",
    description: "Seuils et alertes de rupture",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "delivery_couriers",
    label: "Livreurs",
    description: "Courses et livreurs",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "global_view",
    label: "Vue globale",
    description: "Toutes les boutiques dans une vue",
    plans: { starter: S, pro: P, business: P },
  },
  {
    id: "pos_online_payment",
    label: "Paiement en ligne au POS",
    description: "Wave et Orange Money vérifiés au comptoir",
    plans: { starter: S, pro: S, business: P },
  },
];

export type FeatureOverride = {
  tenantId: string;
  featureId: FeatureId;
  enabled: boolean;
  reason: string;
};

export function featureById(featureId: FeatureId): ProductFeature {
  const feature = FEATURES.find((item) => item.id === featureId);
  if (!feature) throw new Error(`Unknown feature ${featureId}`);
  return feature;
}

export function planIncludesFeature(plan: PlanId, featureId: FeatureId): boolean {
  return featureById(featureId).plans[plan];
}

export function findFeatureOverride(
  overrides: FeatureOverride[],
  tenantId: string,
  featureId: FeatureId
): FeatureOverride | undefined {
  return overrides.find((item) => item.tenantId === tenantId && item.featureId === featureId);
}

export function isFeatureEnabled(
  plan: PlanId,
  featureId: FeatureId,
  overrides: FeatureOverride[],
  tenantId: string
): boolean {
  const override = findFeatureOverride(overrides, tenantId, featureId);
  if (override) return override.enabled;
  return planIncludesFeature(plan, featureId);
}

export const ROLE_LABEL: Record<RoleId, string> = {
  super_admin: "Super admin",
  finance: "Finance",
  support: "Support",
  sales: "Ventes",
  lecture: "Lecture seule",
};

export const STATUS_LABEL: Record<TenantStatus, string> = {
  essai: "Essai",
  actif: "Actif",
  impaye: "Impayé",
  suspendu: "Suspendu",
  resilie: "Résilié",
  demo: "Démo",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  initie: "Initié",
  en_attente: "En attente",
  reussi: "Réussi",
  echoue: "Échoué",
  rembourse: "Remboursé",
  expire: "Expiré",
};

export const HEALTH_DEFINITION =
  "Score 0–100 calculé sur cet échantillon : paiement 40, activité sur 30 jours 30, usage des limites du plan 20, tickets ouverts 10. Un compte démo n'est pas noté.";

export const MRR_DEFINITION =
  "Somme des abonnements payants, normalisée au mois. Un impayé reste dans le MRR jusqu'à suspension. Essai, offert, suspendu, résilié et démo valent 0 F. Ce n'est pas le chiffre d'affaires des marchands.";

export const GMV_DEFINITION =
  "Volume d'affaires traité : ventes encaissées par les marchands sur 30 jours. Ce n'est pas le revenu d'ECOM 360.";

export const ACTIVE_DEFINITION =
  "Entreprise avec au moins une vente dans les 7 derniers jours. Les comptes démo sont exclus, sauf si le filtre démo est activé.";

const TODAY = new Date("2026-10-08T12:00:00Z");

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} F`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function daysFromToday(iso: string): number {
  const target = new Date(iso).getTime();
  return Math.round((target - TODAY.getTime()) / 86400000);
}

export function daysSince(iso: string): number {
  return Math.round((TODAY.getTime() - new Date(iso).getTime()) / 86400000);
}

export function isoDaysAgo(days: number): string {
  const date = new Date(TODAY);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export function monthlyAmount(tenant: Tenant): number {
  if (tenant.isDemo || tenant.status === "demo") return 0;
  if (tenant.status === "essai" || tenant.status === "suspendu" || tenant.status === "resilie") {
    return 0;
  }
  const price = PLAN_PRICE[tenant.plan];
  if (tenant.cycle === "annuel") return Math.round((price * 10) / 12);
  return price;
}

export function healthScore(tenant: Tenant): number | null {
  if (tenant.isDemo || tenant.status === "demo") return null;
  const payment =
    tenant.status === "actif"
      ? 40
      : tenant.status === "essai"
        ? 28
        : tenant.status === "impaye"
          ? 12
          : 0;
  const idle = daysSince(tenant.lastActivity);
  const activity = idle <= 7 ? 30 : idle <= 14 ? 18 : idle <= 30 ? 8 : 0;
  const limits = PLAN_LIMITS[tenant.plan];
  const ratio = tenant.salesMonth / limits.sales;
  const usage = ratio < 0.8 ? 20 : ratio <= 1 ? 12 : 4;
  const tickets = tenant.openTickets === 0 ? 10 : tenant.openTickets === 1 ? 4 : 0;
  return payment + activity + usage + tickets;
}

export function isActiveTenant(tenant: Tenant): boolean {
  if (tenant.status === "suspendu" || tenant.status === "resilie" || tenant.status === "demo") {
    return false;
  }
  return daysSince(tenant.lastActivity) <= 7;
}

export type ActionId =
  | "remind"
  | "confirmPayment"
  | "refund"
  | "suspend"
  | "impersonate"
  | "export"
  | "reveal"
  | "changePlan"
  | "manageFeatures";

const ACTION_ROLES: Record<ActionId, RoleId[]> = {
  remind: ["super_admin", "support", "finance"],
  confirmPayment: ["super_admin", "finance"],
  refund: ["super_admin", "finance"],
  suspend: ["super_admin", "support"],
  impersonate: ["super_admin", "support"],
  export: ["super_admin", "finance", "support"],
  reveal: ["super_admin", "finance", "support", "sales"],
  changePlan: ["super_admin", "finance"],
  manageFeatures: ["super_admin"],
};

export function canDo(role: RoleId, action: ActionId): boolean {
  return ACTION_ROLES[action].includes(role);
}

export function denyReason(role: RoleId): string {
  if (role === "lecture") return "Votre accès est en lecture seule.";
  return `Action non autorisée pour le rôle ${ROLE_LABEL[role]}.`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `${digits.slice(0, 2)} ••• •• ${digits.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "•••";
  return `${name.slice(0, 1)}•••@${domain}`;
}

export type NavGroup = {
  id: string;
  label: string;
  items: { to: string; label: string; roles: RoleId[] }[];
};

const ALL: RoleId[] = ["super_admin", "finance", "support", "sales", "lecture"];
const NO_SALES: RoleId[] = ["super_admin", "finance", "support", "lecture"];
const MONEY: RoleId[] = ["super_admin", "finance", "lecture"];
const OPS: RoleId[] = ["super_admin", "lecture"];
const SECURITY: RoleId[] = ["super_admin", "support", "lecture"];

export const NAV: NavGroup[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      { to: "/backoffice/v2", label: "Vue d'ensemble", roles: ALL },
      { to: "/backoffice/v2/analytics", label: "Analytics", roles: NO_SALES },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    items: [
      { to: "/backoffice/v2/entreprises", label: "Entreprises", roles: ALL },
      { to: "/backoffice/v2/utilisateurs", label: "Utilisateurs", roles: NO_SALES },
      {
        to: "/backoffice/v2/leads",
        label: "Demandes de démo",
        roles: ["super_admin", "sales", "support", "lecture"],
      },
    ],
  },
  {
    id: "revenus",
    label: "Revenus",
    items: [
      { to: "/backoffice/v2/abonnements", label: "Abonnements", roles: [...MONEY, "sales"] },
      { to: "/backoffice/v2/paiements", label: "Paiements & factures", roles: MONEY },
      { to: "/backoffice/v2/relances", label: "Relances", roles: MONEY },
      { to: "/backoffice/v2/plans", label: "Plans & tarifs", roles: MONEY },
      { to: "/backoffice/v2/codes", label: "Codes promo", roles: MONEY },
    ],
  },
  {
    id: "produit",
    label: "Produit",
    items: [
      {
        to: "/backoffice/v2/modules",
        label: "Modules & fonctionnalités",
        roles: ["super_admin", "lecture"],
      },
      {
        to: "/backoffice/v2/annonces",
        label: "Annonces in-app",
        roles: ["super_admin", "lecture"],
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      {
        to: "/backoffice/v2/tickets",
        label: "Tickets",
        roles: ["super_admin", "support", "lecture"],
      },
      {
        to: "/backoffice/v2/assistance",
        label: "Sessions d'assistance",
        roles: ["super_admin", "support", "lecture"],
      },
    ],
  },
  {
    id: "ops",
    label: "Opérations",
    items: [
      { to: "/backoffice/v2/sante", label: "Santé de la plateforme", roles: [...OPS, "support"] },
      { to: "/backoffice/v2/incidents", label: "Incidents", roles: OPS },
      { to: "/backoffice/v2/taches", label: "Tâches & files", roles: OPS },
      { to: "/backoffice/v2/integrations", label: "Intégrations", roles: OPS },
    ],
  },
  {
    id: "securite",
    label: "Sécurité & conformité",
    items: [
      { to: "/backoffice/v2/audit", label: "Journal d'audit", roles: SECURITY },
      {
        to: "/backoffice/v2/equipe",
        label: "Équipe interne & rôles",
        roles: ["super_admin", "lecture"],
      },
      {
        to: "/backoffice/v2/sessions",
        label: "Sessions & accès",
        roles: ["super_admin", "lecture"],
      },
      {
        to: "/backoffice/v2/donnees",
        label: "Demandes données personnelles",
        roles: ["super_admin", "lecture"],
      },
    ],
  },
];

export function navAllowed(role: RoleId): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
