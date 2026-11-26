/** Stable keys shared with the backend catalog (`PlanFeatures`). */
export const PLAN_FEATURES = [
  { key: "expenses", label: "Dépenses" },
  { key: "reports", label: "Rapports" },
  { key: "advanced_reports", label: "Rapports avancés" },
  { key: "multi_payment", label: "Paiements multiples" },
  { key: "export_pdf", label: "Export PDF" },
  { key: "export_excel", label: "Export Excel" },
  { key: "client_credits", label: "Crédits clients" },
  { key: "supplier_tracking", label: "Fournisseurs" },
  { key: "role_management", label: "Rôles" },
  { key: "api", label: "API" },
  { key: "custom_branding", label: "Marque" },
  { key: "priority_support", label: "Support prioritaire" },
  { key: "account_manager", label: "Account manager" },
  { key: "stock_alerts", label: "Alertes stock" },
  { key: "delivery_couriers", label: "Livreurs" },
  { key: "global_view", label: "Vue globale" },
  { key: "pos_online_payment", label: "Paiement mobile au POS" },
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURES)[number]["key"];
