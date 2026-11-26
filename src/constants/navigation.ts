import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Truck,
  Bike,
  Receipt,
  ListOrdered,
  ClipboardList,
  Store,
  Settings,
  Sparkles,
  Boxes,
} from "lucide-react";
import type { Permission } from "@/constants/roles";

export type NavItem = {
  key: string;
  permission: Permission;
  icon: LucideIcon;
  label: string;
  /** Optional query used to distinguish catalog views. */
  search?: string;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    items: [
      {
        key: "/dashboard",
        permission: "dashboard",
        icon: LayoutDashboard,
        label: "Tableau de bord",
      },
      {
        key: "/vue-globale",
        permission: "globalView",
        icon: Store,
        label: "Vue globale",
      },
    ],
  },
  {
    id: "sales",
    label: "Ventes",
    items: [
      { key: "/pos", permission: "pos", icon: ShoppingCart, label: "Caisse" },
      { key: "/sales", permission: "pos", icon: ListOrdered, label: "Historique" },
    ],
  },
  {
    id: "catalog",
    label: "Catalogue",
    items: [
      { key: "/products", permission: "products", icon: Package, label: "Produits" },
      {
        key: "/products",
        search: "?type=service",
        permission: "products",
        icon: Sparkles,
        label: "Prestations",
      },
    ],
  },
  {
    id: "operations",
    label: "Opérations",
    items: [
      { key: "/stock", permission: "products", icon: Boxes, label: "Stock" },
      { key: "/suppliers", permission: "suppliers", icon: Truck, label: "Fournisseurs" },
      {
        key: "/purchase-orders",
        permission: "purchaseOrders",
        icon: ClipboardList,
        label: "Achats",
      },
      { key: "/livreurs", permission: "livreurs", icon: Bike, label: "Livreurs" },
    ],
  },
  {
    id: "customers",
    label: "Clients",
    items: [{ key: "/clients", permission: "clients", icon: Users, label: "Annuaire" }],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { key: "/expenses", permission: "expenses", icon: Receipt, label: "Dépenses" },
      { key: "/reports", permission: "reports", icon: FileText, label: "Rapports" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [{ key: "/settings", permission: "settings", icon: Settings, label: "Paramètres" }],
  },
];

export function navItemHref(item: NavItem): string {
  return `${item.key}${item.search ?? ""}`;
}

export function matchNavKey(pathname: string, search: string, item: NavItem): boolean {
  if (item.search) {
    if (pathname !== item.key && !pathname.startsWith(`${item.key}/`)) return false;
    return new URLSearchParams(search).get("type") === new URLSearchParams(item.search).get("type");
  }
  if (item.key === "/products") {
    return (
      (pathname === "/products" || pathname.startsWith("/products/")) &&
      new URLSearchParams(search).get("type") !== "service"
    );
  }
  return pathname === item.key || pathname.startsWith(`${item.key}/`);
}

export const MORE_SECTION_PREFIXES = [
  "/settings",
  "/clients",
  "/expenses",
  "/suppliers",
  "/purchase-orders",
  "/stock",
  "/livreurs",
  "/sales",
  "/vue-globale",
  "/profile",
] as const;

export function matchesMoreSection(pathname: string): boolean {
  return MORE_SECTION_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
