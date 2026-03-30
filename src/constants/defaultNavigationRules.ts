/**
 * Fallback si l'API ne renvoie pas encore `navigationRules` — doit rester aligné avec
 * `NavigationPermissionRules.java` (ecom360be). Les clés sont vérifiées par
 * `NavigationPermissionRulesTest` côté backend.
 */
export const DEFAULT_NAVIGATION_RULES: Record<string, string[]> = {
  dashboard: ["SALES_READ", "PRODUCTS_READ"],
  pos: ["SALES_CREATE"],
  products: ["PRODUCTS_READ"],
  clients: ["CLIENTS_READ"],
  suppliers: ["SUPPLIERS_READ"],
  livreurs: [
    "DELIVERY_COURIERS_READ",
    "DELIVERY_COURIERS_CREATE",
    "DELIVERY_COURIERS_UPDATE",
    "DELIVERY_COURIERS_DELETE",
  ],
  globalView: ["GLOBAL_VIEW_READ"],
  expenses: ["EXPENSES_READ"],
  reports: ["REPORTS_READ"],
  settings: ["STORES_READ", "SUBSCRIPTION_READ", "BUSINESS_USERS_READ"],
  "settings:stores": ["STORES_READ"],
  "settings:profile": ["STORES_READ"],
  "settings:subscription": ["SUBSCRIPTION_READ"],
  "settings:users": ["BUSINESS_USERS_READ"],
  "settings:roles": ["BUSINESS_USERS_READ"],
  "settings:security": ["STORES_READ"],
  "settings:notifications": ["STORES_READ"],
  backoffice: [],
};
