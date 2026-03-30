import type { PermissionCatalogItem } from "@/api/roles";

/** Titres de sections (clé `category` renvoyée par l’API). */
export const PERMISSION_CATEGORY_TITLES: Record<string, string> = {
  products: "Produits",
  categories: "Catégories",
  stock: "Stock",
  clients: "Clients",
  suppliers: "Fournisseurs",
  purchase_orders: "Achats fournisseurs",
  sales: "Ventes",
  expenses: "Dépenses",
  delivery: "Livraison",
  stores: "Boutiques",
  global_view: "Vue globale",
  reports: "Rapports",
  subscription: "Abonnement",
  team: "Équipe",
  integrations: "API & webhooks",
  commerce: "Commerce connecté",
  other: "Autres",
};

export type PermissionCategoryGroup = {
  category: string;
  title: string;
  items: PermissionCatalogItem[];
};

export function groupPermissionsByCategory(
  catalog: PermissionCatalogItem[]
): PermissionCategoryGroup[] {
  const map = new Map<string, PermissionCatalogItem[]>();
  for (const item of catalog) {
    const key = item.category || "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const groups: PermissionCategoryGroup[] = [];
  for (const [category, items] of map) {
    groups.push({
      category,
      title: PERMISSION_CATEGORY_TITLES[category] ?? category,
      items,
    });
  }
  groups.sort((a, b) => {
    const amin = a.items[0]?.sortOrder ?? 0;
    const bmin = b.items[0]?.sortOrder ?? 0;
    return amin - bmin;
  });
  return groups;
}

export function labelForPermissionCode(
  code: string,
  catalog: PermissionCatalogItem[] | undefined
): string {
  if (!catalog?.length) return code;
  const found = catalog.find((c) => c.code === code);
  return found?.label ?? code;
}
