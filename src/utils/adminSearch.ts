export type AdminSearchPage = {
  title: string;
  href: string;
  meta: string;
};

export const ADMIN_SEARCH_PAGES: AdminSearchPage[] = [
  { title: "Tableau de bord", href: "/backoffice", meta: "Page" },
  { title: "Demandes démo", href: "/backoffice/demo-requests", meta: "Page" },
  { title: "Entreprises", href: "/backoffice/businesses", meta: "Page" },
  { title: "Boutiques", href: "/backoffice/stores", meta: "Page" },
  { title: "Utilisateurs", href: "/backoffice/users", meta: "Page" },
  { title: "Paiements", href: "/backoffice/payments", meta: "Page" },
  { title: "Plans", href: "/backoffice/plans", meta: "Page" },
  { title: "Factures", href: "/backoffice/invoices", meta: "Page" },
  { title: "Analytique", href: "/backoffice/revenue", meta: "Page" },
  { title: "Journal d'audit", href: "/backoffice/audit", meta: "Page" },
  { title: "Rôles", href: "/backoffice/roles", meta: "Page" },
  { title: "Santé & config", href: "/backoffice/system", meta: "Page" },
  { title: "Notifications", href: "/backoffice/notifications", meta: "Page" },
];

export function filterAdminSearchPages(query: string): AdminSearchPage[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return ADMIN_SEARCH_PAGES;
  return ADMIN_SEARCH_PAGES.filter((page) =>
    `${page.title} ${page.meta}`.toLowerCase().includes(needle)
  );
}
